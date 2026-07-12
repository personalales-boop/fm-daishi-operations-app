# Athlete 送迎ルート 公開パッケージ

介護送迎ルート作成アプリを、`personalales` や `fm-daishi` を含まないURLで公開するためのSites用パッケージです。

## 内容

- トップページ `/` で配車アプリを全画面表示
- 実体は `public/care-route/` の静的Webアプリ
- 顧客登録、当日搭乗者、車いす対応、車両別配車表に対応
- CSV/Excelファイル選択後、顧客名簿と送迎登録プルダウンへ自動反映

## 確認

```bash
npm run build
npm test
```
