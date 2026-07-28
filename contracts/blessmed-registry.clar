;; ============================================================
;; BlessMed Registry
;; Testnet demo contract — record hashes, reward points,
;; and a daily check-in that spends a small amount of STX.
;; ============================================================

(define-constant err-already-registered (err u100))
(define-constant err-already-checked-in (err u101))
(define-constant err-transfer-failed (err u102))

;; ~0.001 STX (1000 microSTX) — cheap on testnet, still real STX movement
(define-constant CHECK-IN-FEE u1000)

;; Approximate "day" length in burn blocks (testnet is faster;
;; 144 ≈ 1 day on mainnet). Adjust if you want stricter/looser windows.
(define-constant BLOCKS-PER-DAY u144)

;; record-hash -> who registered it, and at what block height
(define-map health-records-registry
  { record-hash: (buff 32) }
  { owner: principal, registered-at: uint }
)

;; principal -> accumulated reward points
(define-map reward-points
  { user: principal }
  { points: uint }
)

;; principal -> last check-in day number (burn-block-height / BLOCKS-PER-DAY)
(define-map last-check-in
  { user: principal }
  { day: uint }
)

;; ---------- Record verification ----------

(define-public (store-record-hash (record-hash (buff 32)))
  (if (map-insert health-records-registry
        { record-hash: record-hash }
        { owner: tx-sender, registered-at: stacks-block-height })
      (ok true)
      err-already-registered))

(define-read-only (get-record (record-hash (buff 32)))
  (map-get? health-records-registry { record-hash: record-hash }))

;; ---------- Reward points ----------

(define-public (earn-points (amount uint))
  (let ((current (default-to { points: u0 }
                    (map-get? reward-points { user: tx-sender }))))
    (map-set reward-points
      { user: tx-sender }
      { points: (+ (get points current) amount) })
    (ok (+ (get points current) amount))))

(define-read-only (get-points (user principal))
  (default-to { points: u0 } (map-get? reward-points { user: user })))

;; ---------- Daily check-in (spends STX) ----------

;; Returns the current "day" index derived from burn-block-height.
(define-read-only (current-day)
  (/ burn-block-height BLOCKS-PER-DAY))

;; Returns the last day this user checked in, or none.
(define-read-only (get-last-check-in (user principal))
  (map-get? last-check-in { user: user }))

;; True if the user has already checked in during the current day.
(define-read-only (has-checked-in-today (user principal))
  (match (map-get? last-check-in { user: user })
    entry (is-eq (get day entry) (current-day))
    false))

;; Daily check-in:
;; 1. Reject if already checked in today
;; 2. Transfer CHECK-IN-FEE microSTX from the caller into the contract
;; 3. Record today's day
;; 4. Award a small number of points (5) as a reward
;;
;; The STX sits in the contract (as-contract). On testnet this is
;; effectively a demo fee; you can later add a withdraw for a treasury.
(define-public (daily-check-in)
  (let (
    (today (current-day))
    (already (has-checked-in-today tx-sender))
  )
    (asserts! (not already) err-already-checked-in)
    ;; Pull STX from the user into the contract
    (try! (stx-transfer? CHECK-IN-FEE tx-sender (as-contract tx-sender)))
    ;; Record check-in day
    (map-set last-check-in { user: tx-sender } { day: today })
    ;; Award points
    (let ((current (default-to { points: u0 }
                      (map-get? reward-points { user: tx-sender }))))
      (map-set reward-points
        { user: tx-sender }
        { points: (+ (get points current) u5) })
      (ok {
        day: today,
        fee: CHECK-IN-FEE,
        points-awarded: u5,
        new-total: (+ (get points current) u5)
      }))))
