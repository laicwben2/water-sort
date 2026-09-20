# 關卡生成設計與改善規劃

狀態：Phase 1 baseline 完成，Phase 2 待實作

最後更新：2026-09-20

## 目的

本文記錄 Water Sort 現行關卡生成器的可解性原理、初始液面不一致的原因、已知取捨，以及後續朝經典滿管排列與更可靠難度衡量演進的做法。

現行 generator 的 3,000 關實測結果記錄於 [`generator-baseline.md`](generator-baseline.md)。

## 現行生成策略

生成器從 solved board 開始：每種顏色各自裝滿一根試管，另外加入難度設定指定的空試管。接著使用 seeded PRNG 選擇一系列 reverse moves，逐步把 solved board 轉換成題目。

每個 reverse move 都必須滿足：

- 不超過目標試管容量。
- 不建立重複 board。
- 該 move 的 inverse 必須是正式遊戲規則允許的 forward pour。
- 不把整根單色試管原封不動移到空管，避免無意義排列。

生成器把 inverse moves 反向保存為 `solution`。因此每個成功生成的題目都有一條已知合法路徑可回到 solved state，可解性來自建構過程，而不是依賴隨機 shuffle 的運氣。

Level Mode 使用以下 seed 格式：

```text
water-sort:v1:<difficulty>:level:<level-number>
```

相同 generator version、difficulty 與 level number 會得到相同題目。Random Game 則使用新的隨機 seed。

## 現行 complexity heuristic

目前 complexity 由三個因素組成：

- 相鄰液體的顏色邊界數。
- 包含多種顏色的試管數。
- 尚未裝滿的非空試管數。

生成器會拒絕：

- 已完成的盤面。
- complexity 未達難度門檻的盤面。
- 已知解法長度低於顏色數兩倍的盤面。
- 同一次生成過程中已出現的盤面。

這個 heuristic 適合快速排除明顯 trivial 的題目，但不等同於最短解長度，也不能完整代表玩家實際感受到的難度。

## 為何初始液面高度不一致

reverse move 允許只移動來源頂部同色液體的一部分。多次拆分後，總液體量與總空位保持不變，但空位可能分散在多根試管中。

例如，四種顏色與兩根空管代表總共有八格空位。現行生成結果可能是：

```text
4, 4, 1, 3, 4, 0
```

而不是經典 Water Sort 常見的：

```text
4, 4, 4, 4, 0, 0
```

因此，目前 `emptyTubes: 2` 實際保證的是兩根試管容量的總空間，不保證開場畫面存在兩根完全空的試管。

此外，現行 complexity 會為 partial tube 加分，所以液面不一致不只是偶然結果，現有 heuristic 也會略微偏好這種盤面。

這是目前 generator 的設計結果，不是 guaranteed-solvable generation 的必要限制。

## 產品取捨

### 不規則液面的優點

- 開場排列變化較大。
- 空間分布會產生不同操作選擇。
- reverse generation 容易產生足夠多樣的可解題目。

### 不規則液面的缺點

- 不符合多數玩家對經典 Water Sort 的預期。
- 題目可能看起來像已經由其他玩家操作過幾步。
- 分散空位有時會降低限制，未必真的增加難度。
- `emptyTubes` 設定名稱容易讓維護者誤以為它代表畫面上的空管數量。

## 建議的產品方向

Level Mode 預設採用 Classic 盤面：

- 所有非空試管在開場時均為滿管。
- 畫面上恰好保留 `emptyTubes` 根完全空的試管。
- 至少一定比例的非空試管必須混色。
- 題目仍需保留可重現 seed 與可解性證明。

Random Game 可以保留兩種生成風格：

- `Classic`：非空試管全部裝滿，符合傳統 Water Sort 外觀。
- `Dynamic`：允許 partial tubes，提供較不規則的空間配置。

第一階段不必立刻在 UI 暴露模式選擇；可以先讓 Level Mode 使用 Classic，Random Game 保留現行 Dynamic 行為。

## 建議實作：constrained reverse search

優先延續現有「從 solved state 反向建構」策略，但把單一路徑 greedy generation 改成 seeded beam search 或 backtracking。

搜尋期間允許 partial tubes，候選終點則必須符合：

```ts
const hasClassicOccupancy =
  board.filter((tube) => tube.length === 0).length === config.emptyTubes &&
  board.every((tube) => tube.length === 0 || tube.length === capacity)
```

候選終點還需要：

- `mixedTubeCount` 達到最低門檻。
- `colorTransitions` 達到最低門檻。
- 盤面不是 solved state。
- 已知 forward solution 達到最低長度。
- 與近期或同一批關卡沒有 canonical duplicate。

不建議只在現行 generator 最後加入 occupancy rejection。現行 greedy path 很常停在 partial state，單純重試可能造成高失敗率或 seed 生成時間不穩定。Beam search 可以保留多個候選狀態，同時朝 complexity 與 Classic occupancy 收斂。

## 替代方案：shuffle 後由 solver 驗證

另一個可行方案是先建立顏色數量守恆且所有有色試管均裝滿的排列，再交由 solver 驗證：

1. 產生 balanced full-tube shuffle。
2. 以 BFS、A* 或 IDA* 搜尋合法解。
3. 找不到解、解太短或超過資源限制時重新生成。
4. 保存 solver 找到的 solution 與難度資料。

這不是未驗證的隨機 shuffle，因為只有經 solver 證明可解的盤面才會被接受。缺點是 Medium、Hard 的搜尋成本可能較高，屆時可使用 Web Worker、bounded search，或在 release 前預先產生 level catalog。

## 難度模型改善

長期不應把 partial tube 數量直接視為難度。較可靠的難度指標包括：

- 最短或近似最短解步數。
- 每個狀態的平均合法分支數。
- 顏色交錯與 buried color 深度。
- 是否需要暫時拆開已整理的同色區塊。
- 容易進入但難以恢復的錯誤路徑數量。
- solver 探索的狀態數或 search depth。

建議先保留現有 heuristic 作為便宜的第一層過濾，再對通過的候選盤面執行 bounded solver assessment。

## Seed 與向後相容性

生成演算法的改動會改變既有 seed 對應的盤面。推出 Classic generator 時應使用新的 namespace：

```text
water-sort:v2:<difficulty>:level:<level-number>
```

這能避免同一個 `v1` seed 在不同版本對應不同題目。Persistence migration 應保留尚未完成的 `v1` 遊戲；新開關卡才切換到 `v2`。

## 分階段執行

### Phase 1：明確化與測試

- [x] 將 `emptyTubes` 的現行含義補充到程式註解。
- [x] 新增 occupancy 規格、顏色數量守恆與 solution replay batch 測試。
- [x] 統計 3,000 個 seed 的空管數、partial tube、complexity、重複率與效能分布。

### Phase 2：Classic generator prototype

- 實作 deterministic constrained beam search。
- 終點強制為滿管或空管。
- 保留 forward solution 與最低 complexity 檢查。
- 對 Easy、Medium、Hard 各批次產生至少數百個 seed，測量成功率與執行時間。

### Phase 3：Solver-based difficulty

- 加入 canonical board representation，消除試管排列與顏色命名造成的對稱狀態。
- 加入 bounded solver。
- 依 solution depth、branching factor 與 explored states 校準難度。
- 對無法在時間限制內評估的候選盤面安全重試。

### Phase 4：產品整合

- Level Mode 切換至 `v2` Classic generator。
- 視需要讓 Random Game 提供 Classic／Dynamic 選擇。
- 為舊 localStorage 資料加入 migration。
- 執行 Desktop Chrome 與 iPhone Safari 的完整 regression test。

## 驗收條件

Classic Level Mode 完成時應滿足：

- 相同 difficulty、level number 與 generator version 永遠產生相同 board。
- 每個生成盤面都能重播保存的 solution 並完成。
- 開場恰好具有設定數量的完全空管。
- 其他試管全部裝滿。
- 每種顏色的總層數等於 capacity。
- 開場不是 solved state。
- 不接受低於難度門檻的 trivial puzzle。
- 批次生成不出現大量 canonical duplicates。
- Easy、Medium、Hard 的 solver-based metrics 呈現可觀察的難度差異。
- 既有未完成的 `v1` 遊戲不會因升級而遺失。

## 尚未決定事項

- Level Mode 是否完全禁止 Dynamic 盤面。
- Random Game 是否在第一版就顯示 Classic／Dynamic 選擇器。
- Hard 關卡採用即時 solver 還是預先產生 catalog。
- 最短解是精確計算，或使用有時間上限的近似值。
