export const metadata = {
  title: "Athlete 送迎ルート",
  description: "介護送迎の顧客登録、当日搭乗者、車両別配車表、CSV/Excel取り込みをまとめて管理するWebアプリです。",
};

export default function Home() {
  return (
    <main className="app-frame-shell">
      <iframe
        className="app-frame"
        src="/care-route/"
        title="Athlete 送迎ルート"
        allow="clipboard-read; clipboard-write; geolocation"
      />
    </main>
  );
}
