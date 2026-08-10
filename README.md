# CONCERT-FORM 退避・復元手順

## 現在の状態の保存先
- 現在のフォーム画面は [backups/2026-08-10-current-state/index.html](backups/2026-08-10-current-state/index.html) に保存済みです。

## ここまでの状態に戻す方法
PowerShell から次のコマンドを実行してください。

```powershell
./restore-current-state.ps1
```

これで [index.html](index.html) がバックアップ版へ戻ります。
