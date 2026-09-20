# v3 離線關卡 Catalog Prototype

日期：2026-09-20

## 決策

v3 不在使用者的瀏覽器執行 solver。題目在開發階段離線產生、求解、去重與分級，通過驗證後才作為靜態 catalog 隨網站發布。

這個方向取代「從 solved state 反向倒推」作為下一代正式關卡來源，目的是減少倒推路徑偏差、canonical 重複與看似複雜但實際解法直接的題目。

目前 production 仍使用 v2。這份 60 題 catalog 是演算法 prototype，不會改變線上 Level seed 或玩家保存中的盤面。

## Pipeline

1. 依 seed 建立每種顏色恰好四層的 balanced multiset。
2. 隨機排列後填滿所有有色試管，不產生 partial tube。
3. 對完全相同的彩色排列分別加入 1、2、3 根空管。
4. 使用 bounded A* 套用正式遊戲規則搜尋。
5. 將結果分成 `solved`、`unsolvable`、`budget-exceeded`。
6. 依最短解長度與搜尋資料挑選符合難度目標的空管配置。
7. 以忽略管序與顏色名稱的 exact canonical key 排除同構題目。
8. 保存盤面、solution、solver metrics 與各空管數的測試結果。
9. 使用獨立 validator 重播 solution 並檢查所有 invariants。

## Canonical strategy

Canonical representation 分成兩層：

- `canonicalStateKey`：忽略試管順序但保留顏色 ID，供 solver 的 visited-state set 使用。
- `canonicalPuzzleKey`：同時忽略試管順序與顏色名稱，供離線 catalog 去重使用。

跨題 key 會枚舉顏色重新命名，因此不放在 solver 熱路徑，也不會在瀏覽器中計算。

## Solver semantics

Solver 使用固定的節點與深度限制，不使用執行時間作 cutoff。這確保相同輸入不會因裝置速度不同產生不同判定。

- `solved`：找到一條最短解，並保存可重播 moves。
- `unsolvable`：完整搜尋空間耗盡，能證明沒有解。
- `budget-exceeded`：達到節點或深度限制，結果未知；不得當成無解。

搜尋 heuristic 使用「目前顏色 segments 數－顏色數」。每次合法倒水最多合併一個 segment，因此可作為不高估剩餘步數的 A* lower bound。

## Prototype configuration

| Difficulty | Colors | Candidate empty tubes | Accepted puzzles | Solver state budget |
| --- | ---: | --- | ---: | ---: |
| Easy | 4 | 1, 2, 3 | 20 | 60,000 |
| Medium | 5 | 1, 2, 3 | 20 | 180,000 |
| Hard | 6 | 1, 2, 3 | 20 | 400,000 |

目前挑選分數以目標最短解長度為主，並暫時偏好兩根空管。因此 prototype 最終接受的 60 題都是兩根空管；真正有價值的資料是每個相同排列在不同空管數下的 solver 結果。

## Empty-tube results

| Difficulty | 1 empty solved | 1 empty unsolvable | 2 empty solved | 3 empty solved |
| --- | ---: | ---: | ---: | ---: |
| Easy | 14 / 20 | 6 / 20 | 20 / 20 | 20 / 20 |
| Medium | 6 / 20 | 14 / 20 | 20 / 20 | 20 / 20 |
| Hard | 2 / 20 | 18 / 20 | 20 / 20 | 20 / 20 |

全部 180 次 solver trial 都沒有 `budget-exceeded`。這個樣本顯示一根空管的可解率會隨顏色數增加快速下降，而兩根空管已足以解開所有入選排列。

這不能直接證明所有盤面只需要兩根空管，但證明空管數可以對每個排列個別驗證，不需要在 runtime 或 difficulty config 中盲目寫死。

## Selected puzzle metrics

| Difficulty | Minimum-move range | Mean explored states |
| --- | ---: | ---: |
| Easy | 7–15 | 32 |
| Medium | 11–17 | 148 |
| Hard | 16–20 | 370 |

目前三種 difficulty 已呈現搜尋量差異，但 Hard 的最短解仍偏短。正式 catalog 前需要提高顏色數、改善候選 scoring，並增加對錯誤路徑與 dead ends 的衡量。

## Commands

```bash
# 產生 deterministic prototype catalog
npm run generate:catalog -- --per-difficulty=20 --max-attempts=3000

# 驗證 canonical uniqueness、occupancy、顏色守恆與 solution replay
npm run validate:catalog
```

預設輸出為 `data/levels/v3-prototype.json`。該檔保留完整 audit metadata，因此比未來送到瀏覽器的 production catalog 更冗長。

## 下一階段

1. 將難度評分由固定 solution-length 區間擴充為多指標模型。
2. 測試 Easy 後期 5 色、Medium 6 色、Hard 7–8 色配置。
3. 將 audit catalog 與精簡 runtime catalog 分離。
4. 產生各難度至少 1,000 題，檢查 solver budget、canonical uniqueness 與檔案體積。
5. 人工遊玩各難度的低、中、高分位題目，校準數值與體感。
6. 使用 `catalog:v3:` puzzle ID，保留現有 v1／v2 localStorage 遊戲。
