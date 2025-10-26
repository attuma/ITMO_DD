import pandas as pd

URL = "https://docs.google.com/spreadsheets/d/1l7xAoM2Dt2HQMHk_f_CedVYC9jKW7FpNY-4_-9zNL_s/export?format=csv&gid=0"
df = pd.read_csv(URL)
df["Date"] = pd.to_datetime(df["Date"], dayfirst=True).dt.strftime("%Y-%m-%d")
# если столбца Url нет, создаем его пустым
if "Url" in df.columns:
    df["Url"] = df["Url"].fillna("").astype(str).str.strip()
else:
    df["Url"] = ""

out = df[["Date", "Subject", "Title", "Url"]].sort_values(by="Date")
out = out.rename(columns={
    "Subject":"subject","Title":"title","Date":"date","Difficulty":"difficulty","Url":"url"
})

out.to_json("data/deadlines.json", orient="records", force_ascii=False, indent=2)
