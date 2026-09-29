import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Database,
  FileBarChart,
  FileUp,
  GitBranch,
  Home,
  Lightbulb,
  Menu,
  Moon,
  Network,
  PackageSearch,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBasket,
  Sun,
  Tags,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ForceGraph2D from "react-force-graph-2d";
import { api } from "./api";
import "./index.css";

const nav = [
  ["dashboard", "Dashboard", Home],
  ["upload", "Upload Data", FileUp],
  ["rules", "Rules Explorer", Tags],
  ["recommend", "Recommendation Demo", ShoppingBasket],
  ["network", "Network Graph", Network],
  ["seasonal", "Seasonal Trends", TrendingUp],
  ["segments", "Segments", Users],
  ["revenue", "Revenue Simulator", Target],
  ["reports", "Reports", FileBarChart],
];

function Spinner() {
  return <RefreshCw className="h-4 w-4 animate-spin" />;
}

function Empty({ title, text, action }) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <Database className="mb-4 h-10 w-10 text-slate-300" />
      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Layout({ page, setPage, dark, setDark, children }) {
  const [mobile, setMobile] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 ${
          mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <button onClick={() => setPage("dashboard")} className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
              <ShoppingBasket size={19} />
            </div>
            <span className="text-lg font-black tracking-tight">BasketIQ</span>
          </button>
          <button className="lg:hidden" onClick={() => setMobile(false)}>
            <X size={20} />
          </button>
        </div>
        <p className="px-2 pb-5 pt-1 text-xs text-slate-400">Retail intelligence</p>
        <nav className="space-y-1">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                setMobile(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                page === id
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <button className="lg:hidden" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold">{nav.find((x) => x[0] === page)?.[1]}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Toggle dark mode"
              className="btn-secondary !rounded-full !p-2"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Dashboard({ setPage }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.dashboard().then(setData).catch(() => {});
  }, []);
  if (!data)
    return <Empty title="No data uploaded yet" text="Upload a CSV to start discovering product associations." action={<button className="btn-primary" onClick={() => setPage("upload")}>Upload CSV</button>} />;
  return (
    <>
      <PageHeader title="Dashboard" subtitle="A quick view of your retail association engine." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Transactions", data.transactions, Database],
          ["Rules found", data.rules, GitBranch],
          ["Customers", data.customers, Users],
          ["Products", data.products, PackageSearch],
        ].map(([label, value, Icon]) => (
          <div className="card p-5" key={label}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <Icon size={18} className="text-indigo-600" />
            </div>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Top products</h2>
              <p className="text-xs text-slate-500">By total quantity</p>
            </div>
            <BarChart3 className="text-indigo-600" size={20} />
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.top_products}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#4f46e5" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">Highest-lift pairs</h2>
          <p className="mb-4 text-xs text-slate-500">Strongest discovered associations</p>
          <div className="space-y-3">
            {data.top_rules?.length ? data.top_rules.map((r, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.antecedent} → {r.consequent}</p>
                    <p className="mt-1 text-xs text-slate-500">Confidence {(r.confidence * 100).toFixed(1)}% · Support {(r.support * 100).toFixed(1)}%</p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    Lift {r.lift.toFixed(2)}
                  </span>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">Mine rules to populate this section.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function Upload({ setPage }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [params, setParams] = useState({ min_support: 0.05, min_confidence: 0.3, min_lift: 1 });
  const upload = async () => {
    if (!file) return toast.error("Choose a CSV file first.");
    try {
      setBusy(true);
      const r = await api.upload(file);
      setResult(r);
      toast.success("CSV uploaded and cleaned.");
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const mine = async () => {
    try {
      setBusy(true);
      const r = await api.mine(params);
      toast.success(`Mining finished: ${r.stored_rules} stored rules.`);
      setResult((old) => ({ ...old, mining: r }));
      setPage("dashboard");
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Upload Data" subtitle="Import transaction-level CSV data and run the association engine." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
            <FileUp className="mx-auto mb-3 text-indigo-600" />
            <h2 className="font-bold">Choose transaction CSV</h2>
            <p className="mt-1 text-xs text-slate-500">TransactionID, ProductName, Quantity, InvoiceDate, CustomerID</p>
            <input className="mx-auto mt-5 block max-w-full text-sm" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="mt-3 text-sm font-medium">{file.name}</p>}
          </div>
          <button disabled={busy} onClick={upload} className="btn-primary mt-5 w-full justify-center">
            {busy ? <span className="flex items-center justify-center gap-2"><Spinner /> Processing</span> : "Upload & Clean"}
          </button>
          {result && (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              Cleaned {result.cleaned_rows} rows into {result.transactions} transactions and {result.products} products.
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-bold">Mining thresholds</h2>
          <p className="mt-1 text-sm text-slate-500">Adjust these values and run both Apriori and FP-Growth.</p>
          {[
            ["min_support", "Minimum support", 0.001, 0.3, 0.001],
            ["min_confidence", "Minimum confidence", 0.01, 1, 0.01],
            ["min_lift", "Minimum lift", 0.1, 5, 0.1],
          ].map(([key, label, min, max, step]) => (
            <div className="mt-6" key={key}>
              <div className="flex justify-between">
                <label className="label mb-0">{label}</label>
                <span className="text-sm font-bold">{params[key].toFixed(key === "min_lift" ? 1 : 3)}</span>
              </div>
              <input className="mt-3 w-full accent-indigo-600" type="range" min={min} max={max} step={step} value={params[key]} onChange={(e) => setParams({...params, [key]: Number(e.target.value)})} />
            </div>
          ))}
          <button disabled={busy || !result} onClick={mine} className="btn-primary mt-8 w-full">
            {busy ? <span className="flex items-center justify-center gap-2"><Spinner /> Mining...</span> : "Run Apriori + FP-Growth"}
          </button>
          {result?.mining && (
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><b>Apriori</b><br/>{result.mining.apriori_time}s</div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><b>FP-Growth</b><br/>{result.mining.fpgrowth_time}s</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Rules(){
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("lift");
  const [order, setOrder] = useState("desc");
  const [algorithm, setAlgorithm] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const data = await api.rules({
        search: search.trim(),
        sort_by: sort,
        order: order,
        algorithm: algorithm,
      });

      setRows(data);
    } catch (error) {
      console.error("Rules loading error:", error);
      toast.error(error.message || "Failed to load rules");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sort, order, algorithm]);

  const handleSearch = () => {
    load();
  };

  const toggleOrder = () => {
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
  };

  return (
    <>
      <PageHeader
        title="Rules Explorer"
        subtitle="Search, sort and explore all generated association rules."
      />

      <div className="card p-4">

        {/* FILTERS */}
        <div className="grid gap-3 md:grid-cols-5">

          {/* SEARCH */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <input
              className="input pl-9"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>

          {/* SORT */}
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="lift">Sort by Lift</option>
            <option value="confidence">Sort by Confidence</option>
            <option value="support">Sort by Support</option>
          </select>

          {/* ORDER */}
          <button
            className="btn-secondary"
            onClick={toggleOrder}
            type="button"
          >
            {order === "desc" ? "Highest → Lowest" : "Lowest → Highest"}
          </button>

          {/* ALGORITHM */}
          <select
            className="input"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
          >
            <option value="">All algorithms</option>
            <option value="Apriori">Apriori</option>
            <option value="FP-Growth">FP-Growth</option>
          </select>
        </div>

        {/* SEARCH BUTTON */}
        <button
          className="btn-primary mt-4"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Loading...
            </span>
          ) : (
            "Apply Filters"
          )}
        </button>

        {/* CURRENT SORT INFO */}
        <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
          <b>Sorted by:</b>{" "}
          {sort === "lift"
            ? "Lift"
            : sort === "confidence"
            ? "Confidence"
            : "Support"}{" "}
          ·{" "}
          <b>
            {order === "desc" ? "Highest to Lowest" : "Lowest to Highest"}
          </b>
        </div>

        {/* TABLE */}
        <div className="mt-4 overflow-x-auto">

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner />
                Loading rules...
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="p-3">Antecedent</th>
                  <th className="p-3">Consequent</th>
                  <th className="p-3">Support</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Lift</th>
                  <th className="p-3">Algorithm</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="p-3 font-medium">
                      {r.antecedent}
                    </td>

                    <td className="p-3">
                      {r.consequent}
                    </td>

                    <td className="p-3">
                      {(Number(r.support) * 100).toFixed(1)}%
                    </td>

                    <td className="p-3">
                      {(Number(r.confidence) * 100).toFixed(1)}%
                    </td>

                    <td className="p-3">
                      {Number(r.lift) > 1.2 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {Number(r.lift).toFixed(2)}
                        </span>
                      ) : (
                        Number(r.lift).toFixed(2)
                      )}
                    </td>

                    <td className="p-3 text-xs text-slate-500">
                      {r.algorithm}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}

          {!loading && !rows.length && (
            <p className="p-10 text-center text-sm text-slate-500">
              No rules found. Upload data and run mining.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function Recommend() {
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState("");
  const [rows, setRows] = useState([]);
  useEffect(() => { api.products().then(setProducts).catch(() => {}); }, []);
  useEffect(() => { if (product) api.recommend(product).then(setRows).catch(() => setRows([])); else setRows([]); }, [product]);
  return (
    <>
      <PageHeader title="Recommendation Demo" subtitle="Pick a product and see its strongest associated products." />
      <div className="card p-6">
        <label className="label">Product</label>
        <select className="input max-w-xl" value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">Choose a product...</option>
          {products.map((p) => <option key={p}>{p}</option>)}
        </select>
        {!product ? <div className="mt-10 text-sm text-slate-500">Choose a product to see recommendations.</div> : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {rows.map((r, i) => <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800" key={i}>
              <p className="font-bold">{r.product}</p>
              <p className="mt-3 text-xs text-slate-500">Support</p><p className="font-semibold">{(r.support*100).toFixed(1)}%</p>
              <p className="mt-2 text-xs text-slate-500">Confidence</p><p className="font-semibold">{(r.confidence*100).toFixed(1)}%</p>
              <p className="mt-2 text-xs text-slate-500">Lift</p><p className="font-black text-indigo-600">{r.lift.toFixed(2)}</p>
            </div>)}
          </div>
        )}
        <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
          <b>Metric guide:</b> Support = how often the combination appears. Confidence = how often the recommendation follows the chosen product. Lift = how much stronger the association is than random co-occurrence.
        </div>
      </div>
    </>
  );
}

function NetworkGraph() {
  const [data, setData] = useState({
    nodes: [],
    edges: [],
  });

  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNetwork = async () => {
      try {
        setLoading(true);

        const result = await api.network();

        console.log("Network Graph API response:", result);

        setData({
          nodes: Array.isArray(result.nodes) ? result.nodes : [],
          edges: Array.isArray(result.edges) ? result.edges : [],
        });
      } catch (error) {
        console.error("Network Graph error:", error);
        toast.error(error.message || "Failed to load network graph");

        setData({
          nodes: [],
          edges: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadNetwork();
  }, []);

  const graph = useMemo(() => {
    return {
      nodes: data.nodes.map((node) => ({
        ...node,
        id: String(node.id),
        label: String(node.label),
        val: Math.max(
          4,
          Math.sqrt(Number(node.popularity) || 1)
        ),
      })),

      links: data.edges.map((edge) => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target),
        lift: Number(edge.lift) || 1,
      })),
    };
  }, [data]);

  if (loading) {
    return (
      <>
        <PageHeader
          title="Network Graph"
          subtitle="Products are nodes; stronger associations create stronger connections."
        />

        <Empty
          title="Loading network..."
          text="Fetching product association data."
        />
      </>
    );
  }

  if (!graph.nodes.length) {
    return (
      <>
        <PageHeader
          title="Network Graph"
          subtitle="Products are nodes; stronger associations create stronger connections."
        />

        <Empty
          title="No graph data"
          text="Upload your CSV and run Apriori + FP-Growth first."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Network Graph"
        subtitle="Products are nodes; stronger associations create stronger connections."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

        {/* GRAPH */}
        <div className="card overflow-hidden p-2">

          <div className="h-[620px] w-full">

            <ForceGraph2D
              graphData={graph}

              nodeId="id"

              nodeLabel={(node) =>
                `${node.label} | Popularity: ${node.popularity}`
              }

              nodeVal={(node) => node.val}

              linkSource="source"
              linkTarget="target"

              linkWidth={(link) =>
                Math.max(1, Math.min(Number(link.lift) || 1, 8))
              }

              linkLabel={(link) =>
                `Lift: ${Number(link.lift || 1).toFixed(2)}`
              }

              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}

              onNodeClick={(node) => {
                setSelected(node);
              }}

              cooldownTicks={100}

              d3VelocityDecay={0.35}

              backgroundColor="#ffffff"

              nodeCanvasObject={(node, ctx, globalScale) => {

                const label = String(node.label || "");

                const radius = Math.max(
                  5,
                  Number(node.val) || 5
                );

                /* NODE */
                ctx.beginPath();

                ctx.arc(
                  node.x,
                  node.y,
                  radius,
                  0,
                  2 * Math.PI
                );

                ctx.fillStyle = "#4f46e5";
                ctx.fill();

                /* BORDER */
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "#312e81";
                ctx.stroke();

                /* LABEL */
                if (globalScale > 0.8) {

                  const fontSize = Math.max(
                    8,
                    12 / globalScale
                  );

                  ctx.font = `bold ${fontSize}px Arial`;

                  ctx.fillStyle = "#111827";

                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";

                  ctx.fillText(
                    label,
                    node.x + radius + 4,
                    node.y
                  );
                }
              }}

              linkCanvasObjectMode={() => "after"}

              linkCanvasObject={(link, ctx, globalScale) => {

                if (!link.source || !link.target) {
                  return;
                }

                const source = link.source;
                const target = link.target;

                if (
                  typeof source.x !== "number" ||
                  typeof source.y !== "number" ||
                  typeof target.x !== "number" ||
                  typeof target.y !== "number"
                ) {
                  return;
                }

                const lift = Number(link.lift) || 1;

                if (globalScale > 1.2) {

                  const text = `×${lift.toFixed(1)}`;

                  const middleX =
                    (source.x + target.x) / 2;

                  const middleY =
                    (source.y + target.y) / 2;

                  const fontSize = Math.max(
                    8,
                    10 / globalScale
                  );

                  ctx.font = `${fontSize}px Arial`;

                  ctx.fillStyle = "#475569";

                  ctx.textAlign = "center";

                  ctx.fillText(
                    text,
                    middleX,
                    middleY
                  );
                }
              }}
            />

          </div>
        </div>

        {/* SELECTED PRODUCT */}
        <div className="card p-5">

          <h2 className="font-bold">
            Selected Product
          </h2>

          {selected ? (
            <>
              <div className="mt-5 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10">

                <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                  {selected.label}
                </p>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Popularity quantity
                </p>

                <p className="text-2xl font-black">
                  {Number(selected.popularity || 0).toFixed(0)}
                </p>

              </div>

              <div className="mt-5 text-sm text-slate-500">
                Click another product node to inspect it.
              </div>
            </>
          ) : (
            <div className="mt-5">

              <p className="text-sm text-slate-500">
                Click any product node in the graph to inspect it.
              </p>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">

                <p className="text-xs text-slate-500">
                  Products
                </p>

                <p className="mt-1 text-2xl font-black">
                  {graph.nodes.length}
                </p>

                <p className="mt-4 text-xs text-slate-500">
                  Connections
                </p>

                <p className="mt-1 text-2xl font-black">
                  {graph.links.length}
                </p>

              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
}

function Seasonal() {
  const [data, setData] = useState(null);
  useEffect(() => { api.seasonal().then(setData).catch(() => setData({months:[],series:[],insight:"Mine rules first."})); }, []);
  const chart = data ? data.months.map((m, i) => {
    const row = {month:m};
    data.series.forEach((s, idx) => row[`r${idx}`] = s.values[i]);
    return row;
  }) : [];
  return (
    <>
      <PageHeader title="Seasonal Trends" subtitle="Compare rule strength across invoice months." />
      {!data?.months?.length ? <Empty title="No seasonal data" text="Upload data and mine rules first." /> :
      <div className="card p-6">
        <div className="h-[420px]">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              {data.series.map((s, i) => <Line key={i} type="monotone" dataKey={`r${i}`} name={s.rule} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
          <b>Auto insight:</b> {data.insight}
        </div>
      </div>}
    </>
  );
}

function Segments() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState("");
  const [rules, setRules] = useState([]);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    try { setBusy(true); const r = await api.segment({n_clusters:3}); toast.success("Customer segmentation complete."); setRows(r.segments); setSelected(r.segments[0]?.label || ""); }
    catch(e){ toast.error(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { api.segments().then(setRows).catch(() => {}); }, []);
  useEffect(() => { if(selected) api.segmentRules(selected).then(setRules).catch(() => setRules([])); }, [selected]);
  const pie = rows.map(r => ({name:r.label, value:r.size}));
  return (
    <>
      <PageHeader title="Customer Segments" subtitle="RFM analysis plus KMeans clustering." action={<button className="btn-primary" onClick={run} disabled={busy}>{busy ? <span className="flex items-center gap-2"><Spinner/> Running</span> : "Run Segmentation"}</button>} />
      {!rows.length ? <Empty title="No segments yet" text="Run customer segmentation after uploading transaction data." /> :
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Segment sizes</h2>
          <div className="h-72">
            <ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={100} label>{pie.map((_,i)=><Cell key={i} fill={["#4f46e5","#0ea5e9","#14b8a6","#f59e0b"][i%4]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <label className="label">Segment</label>
          <select className="input" value={selected} onChange={(e)=>setSelected(e.target.value)}>
            {rows.map(r=><option key={r.label}>{r.label}</option>)}
          </select>
          <div className="mt-5 space-y-3">
            {rules.slice(0,10).map((r,i)=><div key={i} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><b>{r.antecedent} → {r.consequent}</b><div className="mt-1 text-xs text-slate-500">Lift {r.lift.toFixed(2)} · Confidence {(r.confidence*100).toFixed(1)}%</div></div>)}
            {!rules.length && <p className="text-sm text-slate-500">No segment-specific rules found.</p>}
          </div>
        </div>
      </div>}
    </>
  );
}

function Revenue() {
  const [rules, setRules] = useState([]);
  const [selected, setSelected] = useState("");
  const [discount, setDiscount] = useState(10);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.rules({sort_by:"lift",order:"desc"}).then(setRules).catch(()=>{}); }, []);
  const chosen = rules.find(r => String(r.id) === selected);
  const simulate = async () => {
    if (!chosen) return toast.error("Choose a rule.");
    try {
      setBusy(true);
      setResult(await api.simulate({antecedent:chosen.antecedent, consequent:chosen.consequent, discount_percent:discount}));
    } catch(e){ toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Revenue Simulator" subtitle="Run a transparent bundle-discount scenario from historical basket behavior." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <label className="label">Rule / product pair</label>
          <select className="input" value={selected} onChange={(e)=>setSelected(e.target.value)}>
            <option value="">Choose a rule...</option>
            {rules.map(r=><option key={r.id} value={r.id}>{r.antecedent} → {r.consequent} · lift {r.lift.toFixed(2)}</option>)}
          </select>
          <label className="label mt-6">Hypothetical discount: {discount}%</label>
          <input className="w-full accent-indigo-600" type="range" min="0" max="50" step="1" value={discount} onChange={(e)=>setDiscount(Number(e.target.value))}/>
          <button className="btn-primary mt-6 w-full" disabled={busy} onClick={simulate}>{busy ? <span className="flex justify-center gap-2"><Spinner/> Calculating</span> : "Calculate Estimated Revenue Lift"}</button>
        </div>
        <div className="card p-6">
          <p className="text-sm text-slate-500">Estimated Revenue Lift</p>
          <p className="mt-2 text-4xl font-black text-indigo-600">{result ? result.estimated_revenue_lift.toFixed(2) : "—"}</p>
          {result && <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><b>Assumption:</b> {result.assumption}</div>}
        </div>
      </div>
    </>
  );
}

function Reports() {
  const download = () => window.open(api.reportUrl, "_blank");
  return (
    <>
      <PageHeader title="Business Report" subtitle="Turn association metrics into a downloadable strategy summary." />
      <div className="card p-8">
        <div className="max-w-2xl">
          <Lightbulb className="mb-4 text-indigo-600" size={30} />
          <h2 className="text-xl font-black">Generate Business Report</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">The report includes top rules, plain-English bundle/shelf ideas, and customer segment summaries. It also states the limits of association-based analysis.</p>
          <button className="btn-primary mt-6" onClick={download}>Generate & Download PDF</button>
        </div>
      </div>
    </>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(() => localStorage.getItem("basketiq-dark") === "1");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("basketiq-dark", dark ? "1" : "0");
  }, [dark]);

  const content = {
  dashboard: <Dashboard setPage={setPage} />,
  upload: <Upload setPage={setPage} />,
  rules: <Rules />,
  recommend: <Recommend />,
  network: <NetworkGraph />,
  seasonal: <Seasonal />,
  segments: <Segments />,
  revenue: <Revenue />,
  reports: <Reports />,
}[page];
  return <><Layout page={page} setPage={setPage} dark={dark} setDark={setDark}>{content}</Layout><Toaster position="top-right" /></>;
}

createRoot(document.getElementById("root")).render(<App />);
