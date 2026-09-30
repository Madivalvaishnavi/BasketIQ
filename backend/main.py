import io
import json
import math
import os
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import networkx as nx
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mlxtend.frequent_patterns import apriori, association_rules, fpgrowth
from mlxtend.preprocessing import TransactionEncoder
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from sqlalchemy import func
from sqlalchemy.orm import Session
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from database import Base, engine, get_db
from models import Transaction, Rule, CustomerSegment
from schemas import MineRequest, SegmentRequest, RevenueRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BasketIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=Flase,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORT_DIR = Path("reports")
REPORT_DIR.mkdir(exist_ok=True)


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapping = {}
    for c in df.columns:
        key = str(c).strip().lower().replace(" ", "").replace("_", "")
        mapping[key] = c

    required = {
        "transactionid": "TransactionID",
        "productname": "ProductName",
        "quantity": "Quantity",
        "invoicedate": "InvoiceDate",
        "customerid": "CustomerID",
    }
    missing = [k for k in required if k not in mapping]
    if missing:
        raise ValueError(
            "Missing required columns: " + ", ".join(required[k] for k in missing)
        )

    rename = {mapping[k]: v for k, v in required.items()}
    if "unitprice" in mapping:
        rename[mapping["unitprice"]] = "UnitPrice"

    return df.rename(columns=rename)


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df).copy()

    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    df["CustomerID"] = df["CustomerID"].astype("string").str.strip()
    df["TransactionID"] = df["TransactionID"].astype("string").str.strip()
    df["ProductName"] = (
        df["ProductName"].astype("string").str.strip().str.replace(r"\s+", " ", regex=True)
    )

    if "UnitPrice" in df.columns:
        df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce").fillna(1.0)
    else:
        df["UnitPrice"] = 1.0

    # Remove cancelled/negative/zero quantities and missing customer/product/transaction.
    df = df[
        (df["Quantity"] > 0)
        & df["CustomerID"].notna()
        & df["TransactionID"].notna()
        & df["ProductName"].notna()
        & df["InvoiceDate"].notna()
    ].copy()

    df = df[df["ProductName"] != ""]
    df["UnitPrice"] = df["UnitPrice"].clip(lower=0)
    return df


def transaction_baskets(db: Session):
    rows = (
        db.query(Transaction.transaction_id, Transaction.product_name)
        .order_by(Transaction.transaction_id)
        .all()
    )
    baskets = defaultdict(set)
    for tid, product in rows:
        baskets[tid].add(product)
    return [sorted(list(items)) for items in baskets.values() if items]


def itemset_to_string(itemset):
    return ", ".join(sorted(map(str, itemset)))


def parse_itemset(value: str):
    return [x.strip() for x in value.split(",") if x.strip()]


def get_rule_pairs(db: Session):
    rules = db.query(Rule).order_by(Rule.lift.desc()).all()
    return rules


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "BasketIQ"}


@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    try:
        raw = await file.read()
        df = pd.read_csv(io.BytesIO(raw))
        cleaned = clean_dataframe(df)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"CSV processing failed: {exc}")

    if cleaned.empty:
        raise HTTPException(status_code=400, detail="No valid rows remain after cleaning.")

    db.query(Transaction).delete()
    db.query(Rule).delete()
    db.query(CustomerSegment).delete()
    db.commit()

    records = []
    for row in cleaned.itertuples(index=False):
        records.append(
            Transaction(
                transaction_id=str(row.TransactionID),
                product_name=str(row.ProductName),
                quantity=float(row.Quantity),
                invoice_date=row.InvoiceDate.to_pydatetime(),
                customer_id=str(row.CustomerID),
                unit_price=float(row.UnitPrice),
            )
        )

    db.bulk_save_objects(records)
    db.commit()

    return {
        "message": "Data uploaded and cleaned successfully.",
        "filename": file.filename,
        "raw_rows": len(df),
        "cleaned_rows": len(cleaned),
        "transactions": int(cleaned["TransactionID"].nunique()),
        "customers": int(cleaned["CustomerID"].nunique()),
        "products": int(cleaned["ProductName"].nunique()),
    }


@app.post("/api/mine-rules")
def mine_rules(payload: MineRequest, db: Session = Depends(get_db)):
    baskets = transaction_baskets(db)
    if not baskets:
        raise HTTPException(status_code=400, detail="Upload transaction data first.")

    te = TransactionEncoder()
    matrix = te.fit(baskets).transform(baskets)
    basket_df = pd.DataFrame(matrix, columns=te.columns_)

    started = time.perf_counter()
    apr = apriori(
        basket_df,
        min_support=payload.min_support,
        use_colnames=True,
        max_len=3,
    )
    apr_time = time.perf_counter() - started

    started = time.perf_counter()
    fp = fpgrowth(
        basket_df,
        min_support=payload.min_support,
        use_colnames=True,
        max_len=3,
    )
    fp_time = time.perf_counter() - started

    def make_rules(freq):
        if freq.empty:
            return pd.DataFrame(
                columns=["antecedents", "consequents", "support", "confidence", "lift"]
            )
        result = association_rules(
            freq, metric="confidence", min_threshold=payload.min_confidence
        )
        if result.empty:
            return result
        return result[result["lift"] >= payload.min_lift].copy()

    apr_rules = make_rules(apr)
    fp_rules = make_rules(fp)

    # Store FP-Growth rules by default, because it is generally the faster production engine.
    db.query(Rule).delete()
    db.commit()

    seen = set()
    to_store = []
    for algorithm, frame in [("Apriori", apr_rules), ("FP-Growth", fp_rules)]:
        for row in frame.itertuples(index=False):
            ant = itemset_to_string(row.antecedents)
            con = itemset_to_string(row.consequents)
            key = (ant, con, algorithm)
            if key in seen:
                continue
            seen.add(key)
            to_store.append(
                Rule(
                    antecedent=ant,
                    consequent=con,
                    support=float(row.support),
                    confidence=float(row.confidence),
                    lift=float(row.lift),
                    algorithm=algorithm,
                )
            )
    if to_store:
        db.bulk_save_objects(to_store)
        db.commit()

    return {
        "message": "Mining completed.",
        "apriori_rules": len(apr_rules),
        "fpgrowth_rules": len(fp_rules),
        "apriori_itemsets": len(apr),
        "fpgrowth_itemsets": len(fp),
        "apriori_time": round(apr_time, 4),
        "fpgrowth_time": round(fp_time, 4),
        "stored_rules": len(to_store),
    }


@app.get("/api/rules")
def rules(
    sort_by: str = "lift",
    order: str = "desc",
    search: str = "",
    algorithm: str = "",
    db: Session = Depends(get_db),
):
    allowed = {"lift": Rule.lift, "confidence": Rule.confidence, "support": Rule.support}
    column = allowed.get(sort_by, Rule.lift)
    query = db.query(Rule)
    if search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(
            (Rule.antecedent.ilike(q)) | (Rule.consequent.ilike(q))
        )
    if algorithm in {"Apriori", "FP-Growth"}:
        query = query.filter(Rule.algorithm == algorithm)
    if order.lower() == "asc":
        query = query.order_by(column.asc())
    else:
        query = query.order_by(column.desc())

    result = query.all()
    return [
        {
            "id": r.id,
            "antecedent": r.antecedent,
            "consequent": r.consequent,
            "support": r.support,
            "confidence": r.confidence,
            "lift": r.lift,
            "algorithm": r.algorithm,
            "created_at": r.created_at,
        }
        for r in result
    ]


@app.get("/api/recommend/{product}")
def recommend(product: str, db: Session = Depends(get_db)):
    rules = (
        db.query(Rule)
        .filter(
            (Rule.antecedent.ilike(f"%{product}%"))
            | (Rule.consequent.ilike(f"%{product}%"))
        )
        .order_by(Rule.lift.desc(), Rule.confidence.desc())
        .limit(30)
        .all()
    )

    output = []
    for r in rules:
        ants = parse_itemset(r.antecedent)
        cons = parse_itemset(r.consequent)
        if product.lower() in [x.lower() for x in ants]:
            recs = cons
        elif product.lower() in [x.lower() for x in cons]:
            recs = ants
        else:
            recs = cons
        for rec in recs:
            if rec.lower() == product.lower():
                continue
            output.append(
                {
                    "product": rec,
                    "support": r.support,
                    "confidence": r.confidence,
                    "lift": r.lift,
                    "rule": f"{r.antecedent} → {r.consequent}",
                }
            )

    output.sort(key=lambda x: (x["lift"], x["confidence"]), reverse=True)
    unique = []
    seen = set()
    for item in output:
        if item["product"].lower() not in seen:
            unique.append(item)
            seen.add(item["product"].lower())
        if len(unique) == 5:
            break
    return unique


@app.get("/api/network-graph")
def network_graph(db: Session = Depends(get_db)):
    rules = db.query(Rule).all()
    product_counts = dict(
        db.query(Transaction.product_name, func.sum(Transaction.quantity))
        .group_by(Transaction.product_name)
        .all()
    )

    graph = nx.Graph()
    for product, count in product_counts.items():
        graph.add_node(product, popularity=float(count or 0))

    for r in rules:
        ants = parse_itemset(r.antecedent)
        cons = parse_itemset(r.consequent)
        for a in ants:
            for c in cons:
                if a != c:
                    if graph.has_edge(a, c):
                        graph[a][c]["lift"] = max(graph[a][c]["lift"], r.lift)
                    else:
                        graph.add_edge(a, c, lift=float(r.lift))

    nodes = [
        {
            "id": n,
            "label": n,
            "popularity": graph.nodes[n].get("popularity", 1),
        }
        for n in graph.nodes
    ]
    edges = [
        {
            "source": a,
            "target": b,
            "lift": graph[a][b].get("lift", 1),
        }
        for a, b in graph.edges
    ]
    return {"nodes": nodes, "edges": edges}


@app.get("/api/seasonal-trends")
def seasonal_trends(db: Session = Depends(get_db)):
    rows = db.query(Transaction).all()
    if not rows:
        raise HTTPException(status_code=400, detail="Upload data first.")

    df = pd.DataFrame(
        [
            {
                "transaction_id": r.transaction_id,
                "product": r.product_name,
                "date": r.invoice_date,
            }
            for r in rows
        ]
    )
    df["month"] = pd.to_datetime(df["date"]).dt.to_period("M").astype(str)

    top_rules = db.query(Rule).order_by(Rule.lift.desc()).limit(5).all()
    if not top_rules:
        return {"months": [], "series": [], "insight": "Mine rules to see seasonal trends."}

    months = sorted(df["month"].unique().tolist())
    series = []
    for rule in top_rules:
        antecedents = parse_itemset(rule.antecedent)
        consequents = parse_itemset(rule.consequent)
        needed = set(antecedents + consequents)
        values = []
        for month in months:
            mdf = df[df["month"] == month]
            grouped = mdf.groupby("transaction_id")["product"].apply(set)
            n = len(grouped)
            if n == 0:
                lift = None
            else:
                a_count = sum(set(antecedents).issubset(items) for items in grouped)
                c_count = sum(set(consequents).issubset(items) for items in grouped)
                both = sum(needed.issubset(items) for items in grouped)
                pa = a_count / n
                pc = c_count / n
                lift = (both / n) / (pa * pc) if pa and pc else None
            values.append(round(float(lift), 3) if lift is not None else None)
        series.append(
            {
                "rule": f"{rule.antecedent} → {rule.consequent}",
                "values": values,
            }
        )

    insight = "No strong month-over-month change detected."
    best_change = 0
    best_text = None
    for item in series:
        nums = [v for v in item["values"] if v is not None]
        if len(nums) >= 2 and nums[0]:
            change = ((nums[-1] - nums[0]) / nums[0]) * 100
            if abs(change) > abs(best_change):
                best_change = change
                direction = "increases" if change >= 0 else "decreases"
                best_text = f"Lift for {item['rule']} {direction} {abs(change):.1f}% from {months[0]} to {months[-1]}."
    if best_text:
        insight = best_text

    return {"months": months, "series": series, "insight": insight}


@app.post("/api/segment-customers")
def segment_customers(payload: SegmentRequest, db: Session = Depends(get_db)):
    rows = db.query(Transaction).all()
    if not rows:
        raise HTTPException(status_code=400, detail="Upload data first.")

    df = pd.DataFrame(
        [
            {
                "customer": r.customer_id,
                "date": r.invoice_date,
                "quantity": r.quantity,
                "unit_price": r.unit_price,
                "transaction": r.transaction_id,
            }
            for r in rows
        ]
    )
    df["date"] = pd.to_datetime(df["date"])
    snapshot = df["date"].max() + pd.Timedelta(days=1)

    rfm = (
        df.groupby("customer")
        .agg(
            last_purchase=("date", "max"),
            frequency=("transaction", "nunique"),
            monetary=("quantity", lambda x: 0),
        )
        .reset_index()
    )
    monetary = df.assign(value=df["quantity"] * df["unit_price"]).groupby("customer")["value"].sum()
    rfm["monetary"] = rfm["customer"].map(monetary)
    rfm["recency"] = (snapshot - rfm["last_purchase"]).dt.days.astype(float)
    features = rfm[["recency", "frequency", "monetary"]].replace([np.inf, -np.inf], 0).fillna(0)

    n = min(payload.n_clusters, len(rfm))
    if n < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 customers for segmentation.")

    scaled = StandardScaler().fit_transform(features)
    labels = KMeans(n_clusters=n, random_state=42, n_init=10).fit_predict(scaled)

    rfm["cluster"] = labels
    summary = rfm.groupby("cluster")[["recency", "frequency", "monetary"]].mean()

    # Human-readable labels based on cluster averages.
    ordered = summary.sort_values(["monetary", "frequency"], ascending=False).index.tolist()
    label_names = ["High Spenders", "Frequent Buyers", "Bargain Shoppers", "Occasional Buyers",
                   "Emerging Customers", "Loyal Customers", "Value Seekers", "Regular Shoppers"]
    cluster_to_name = {}
    for i, cluster in enumerate(ordered):
        cluster_to_name[cluster] = label_names[i] if i < len(label_names) else f"Segment {i+1}"

    db.query(CustomerSegment).delete()
    for row in rfm.itertuples(index=False):
        db.add(
            CustomerSegment(
                customer_id=str(row.customer),
                segment_label=cluster_to_name[row.cluster],
                recency=float(row.recency),
                frequency=float(row.frequency),
                monetary=float(row.monetary),
            )
        )
    db.commit()

    counts = rfm["cluster"].value_counts().to_dict()
    return {
        "segments": [
            {
                "id": int(cluster),
                "label": cluster_to_name[cluster],
                "size": int(count),
            }
            for cluster, count in sorted(counts.items())
        ]
    }


@app.get("/api/segments")
def segments(db: Session = Depends(get_db)):
    rows = (
        db.query(
            CustomerSegment.segment_label,
            func.count(CustomerSegment.customer_id),
            func.avg(CustomerSegment.recency),
            func.avg(CustomerSegment.frequency),
            func.avg(CustomerSegment.monetary),
        )
        .group_by(CustomerSegment.segment_label)
        .all()
    )
    return [
        {
            "label": label,
            "size": int(size),
            "recency": round(float(recency or 0), 2),
            "frequency": round(float(freq or 0), 2),
            "monetary": round(float(mon or 0), 2),
        }
        for label, size, recency, freq, mon in rows
    ]


@app.get("/api/segments/{segment_id}/rules")
def segment_rules(segment_id: str, db: Session = Depends(get_db)):
    # segment_id may be the human-readable label.
    customers = [
        x.customer_id
        for x in db.query(CustomerSegment)
        .filter(CustomerSegment.segment_label == segment_id)
        .all()
    ]
    if not customers:
        raise HTTPException(status_code=404, detail="Segment not found.")

    transaction_ids = [
        x.transaction_id
        for x in db.query(Transaction.transaction_id)
        .filter(Transaction.customer_id.in_(customers))
        .distinct()
        .all()
    ]
    rows = (
        db.query(Transaction.transaction_id, Transaction.product_name)
        .filter(Transaction.transaction_id.in_(transaction_ids))
        .all()
    )
    baskets = defaultdict(set)
    for tid, product in rows:
        baskets[tid].add(product)

    basket_list = [list(v) for v in baskets.values() if v]
    if len(basket_list) < 2:
        return []

    te = TransactionEncoder()
    matrix = te.fit(basket_list).transform(basket_list)
    bdf = pd.DataFrame(matrix, columns=te.columns_)
    freq = fpgrowth(bdf, min_support=0.02, use_colnames=True, max_len=3)
    if freq.empty:
        return []
    rs = association_rules(freq, metric="confidence", min_threshold=0.1)
    if rs.empty:
        return []

    rs = rs.sort_values(["lift", "confidence"], ascending=False).head(30)
    return [
        {
            "antecedent": itemset_to_string(r.antecedents),
            "consequent": itemset_to_string(r.consequents),
            "support": round(float(r.support), 4),
            "confidence": round(float(r.confidence), 4),
            "lift": round(float(r.lift), 4),
        }
        for r in rs.itertuples(index=False)
    ]


@app.post("/api/simulate-revenue")
def simulate_revenue(payload: RevenueRequest, db: Session = Depends(get_db)):
    rule = (
        db.query(Rule)
        .filter(
            Rule.antecedent == payload.antecedent,
            Rule.consequent == payload.consequent,
        )
        .order_by(Rule.lift.desc())
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")

    rows = db.query(Transaction).all()
    if not rows:
        raise HTTPException(status_code=400, detail="Upload data first.")

    df = pd.DataFrame(
        [
            {
                "transaction": r.transaction_id,
                "product": r.product_name,
                "value": r.quantity * r.unit_price,
            }
            for r in rows
        ]
    )
    basket_values = df.groupby("transaction")["value"].sum()
    average_basket = float(basket_values.mean() or 0)
    baseline = average_basket * rule.confidence * rule.support
    discount_factor = payload.discount_percent / 100
    estimated_increment = baseline * (1 - discount_factor) * rule.lift

    return {
        "estimated_revenue_lift": round(estimated_increment, 2),
        "baseline_basket_value": round(average_basket, 2),
        "rule_confidence": rule.confidence,
        "rule_lift": rule.lift,
        "discount_percent": payload.discount_percent,
        "assumption": (
            "Estimate uses historical average basket value, rule support/confidence, "
            "and lift. Because the required CSV schema has no mandatory price column, "
            "UnitPrice is used when present; otherwise Quantity is treated as a value proxy. "
            "This is a scenario estimate, not a forecast."
        ),
    }


def report_data(db: Session):
    top_rules = db.query(Rule).order_by(Rule.lift.desc()).limit(10).all()
    segments_data = segments(db)
    return top_rules, segments_data


@app.get("/api/report/generate")
def generate_report(db: Session = Depends(get_db)):
    top_rules, segment_data = report_data(db)
    if not top_rules:
        raise HTTPException(status_code=400, detail="Mine rules before generating a report.")

    path = REPORT_DIR / "basketiq_business_report.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("Title2", parent=styles["Title"], fontSize=20, spaceAfter=16)
    body = ParagraphStyle("Body2", parent=styles["BodyText"], leading=15, spaceAfter=8)

    story = [
        Paragraph("BasketIQ — Business Strategy Report", title),
        Paragraph(
            "This report translates market-basket association results into practical retail actions. "
            "Rules describe co-occurrence patterns and should be validated with business constraints before deployment.",
            body,
        ),
        Spacer(1, 8),
        Paragraph("Top Association Rules", styles["Heading2"]),
    ]

    data = [["Antecedent", "Consequent", "Support", "Confidence", "Lift"]]
    for r in top_rules:
        data.append([
            r.antecedent, r.consequent,
            f"{r.support:.3f}", f"{r.confidence:.3f}", f"{r.lift:.2f}"
        ])
    table = Table(data, repeatRows=1, colWidths=[1.35*inch, 1.35*inch, .75*inch, .85*inch, .55*inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2ff")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.grey),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 7.5),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    story += [table, Spacer(1, 16), Paragraph("Plain-English Strategy Ideas", styles["Heading2"])]

    for r in top_rules[:5]:
        story.append(
            Paragraph(
                f"<b>{r.antecedent}</b> is associated with <b>{r.consequent}</b> "
                f"(support {r.support:.1%}, confidence {r.confidence:.1%}, lift {r.lift:.2f}). "
                "Consider testing a bundle offer, nearby shelf placement, or a recommendation placement "
                "where these products are relevant.",
                body,
            )
        )

    if segment_data:
        story += [Paragraph("Customer Segments", styles["Heading2"])]
        for s in segment_data:
            story.append(
                Paragraph(
                    f"<b>{s['label']}</b>: {s['size']} customers; "
                    f"average recency {s['recency']:.1f} days, frequency {s['frequency']:.1f}, "
                    f"monetary value {s['monetary']:.2f}.",
                    body,
                )
            )

    story += [
        Spacer(1, 10),
        Paragraph(
            "Important: association does not prove causation. Promotional, pricing, inventory, "
            "seasonality, and customer mix should be considered before changing merchandising decisions.",
            body,
        ),
    ]
    doc.build(story)

    return FileResponse(
        path,
        media_type="application/pdf",
        filename="basketiq_business_report.pdf",
    )


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    transaction_count = db.query(Transaction.transaction_id).distinct().count()
    rule_count = db.query(Rule).count()
    product_counts = (
        db.query(Transaction.product_name, func.sum(Transaction.quantity))
        .group_by(Transaction.product_name)
        .order_by(func.sum(Transaction.quantity).desc())
        .limit(5)
        .all()
    )
    top_rules = db.query(Rule).order_by(Rule.lift.desc()).limit(3).all()
    return {
        "transactions": transaction_count,
        "rules": rule_count,
        "customers": db.query(Transaction.customer_id).distinct().count(),
        "products": db.query(Transaction.product_name).distinct().count(),
        "top_products": [{"product": p, "quantity": float(q)} for p, q in product_counts],
        "top_rules": [
            {
                "antecedent": r.antecedent,
                "consequent": r.consequent,
                "lift": r.lift,
                "confidence": r.confidence,
                "support": r.support,
            }
            for r in top_rules
        ],
    }


@app.get("/api/products")
def products(db: Session = Depends(get_db)):
    rows = (
        db.query(Transaction.product_name)
        .distinct()
        .order_by(Transaction.product_name.asc())
        .all()
    )
    return [x[0] for x in rows]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000)