# BasketIQ

Full-stack Market Basket Analysis application.

## Stack

- Backend: Python, FastAPI
- Database: SQLite + SQLAlchemy
- Data science: pandas, mlxtend, scikit-learn, networkx
- Frontend: React + Vite + Tailwind CSS
- Charts: Recharts
- Network: react-force-graph
- PDF: ReportLab

## Folder structure

```text
BasketIQ/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── api.js
│       └── index.css
├── sample_data/
│   └── sample_transactions.csv
└── README.md
```

## 1. Backend

Open a terminal in the BasketIQ folder:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Keep this terminal running.

Backend:
http://127.0.0.1:8000

Swagger:
http://127.0.0.1:8000/docs

## 2. Frontend

Open a SECOND terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:
http://localhost:5173

## 3. Test data

Use:

```text
sample_data/sample_transactions.csv
```

Upload it from the BasketIQ Upload Data page.

## Recommended first test

1. Start backend.
2. Start frontend.
3. Open http://localhost:5173
4. Open Upload Data.
5. Select `sample_data/sample_transactions.csv`.
6. Click Upload & Clean.
7. Click Run Apriori + FP-Growth.
8. Go to Dashboard.
9. Test Rules Explorer, Recommendations, Network, Seasonal Trends, Segments, Revenue Simulator, and Reports.

## Notes

The revenue simulator uses UnitPrice if it exists in the CSV. The required schema does not mandate UnitPrice, so when it is absent the backend uses Quantity as a transparent value proxy. The simulator is a scenario estimate, not a financial forecast.

The backend intentionally stores both Apriori and FP-Growth rules with the algorithm name. SQLite is created automatically as `backend/basketiq.db`.

## Common commands

Backend:

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload
```

Frontend:

```powershell
cd frontend
npm run dev
```
