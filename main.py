import pandas as pd

URL = "https://docs.google.com/spreadsheets/d/1l7xAoM2Dt2HQMHk_f_CedVYC9jKW7FpNY-4_-9zNL_s/export?format=csv&gid=0"
df = pd.read_csv(URL)

df = df.dropna(axis=1, how="all")
df = df.loc[:, ~df.columns.str.contains(r"^Unnamed")]

df.columns = df.columns.str.strip().str.lower()

df = df.rename(columns={
    "subject":"subject",
    "title":"title",
    "date":"date",
    "difficulty":"difficulty",
    "url":"url",
})

df["date"] = pd.to_datetime(df["date"], dayfirst=True).dt.strftime("%Y-%m-%d")

allowed = {"easy","medium","hard","exam"}
if "difficulty" in df.columns:
    df["difficulty"] = (
        df["difficulty"]
        .fillna("medium").astype(str).str.strip().str.lower()
    )
    df.loc[~df["difficulty"].isin(allowed), "difficulty"] = "medium"
else:
    df["difficulty"] = "medium"

if "url" not in df.columns:
    df["url"] = ""
df["url"] = df["url"].fillna("").astype(str).str.strip()

out = df[["subject","title","date","difficulty","url"]].sort_values("date")

out.to_json("data/deadlines.json", orient="records", force_ascii=False, indent=2)

