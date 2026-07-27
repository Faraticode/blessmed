;; ============================================================
;; BlessMed Registry
;; A demo contract for the "Decentralized" and "Rewarding"
;; pillars of BlessMed, deployed on the Stacks testnet.
;;
;; Two features:
;; 1. Record verification: store a SHA-256 hash of a health
;;    record (the file itself stays off-chain, in MongoDB —
;;    only its fingerprint goes on-chain) so its integrity can
;;    be verified later; anyone can check a hash was registered
;;    and by whom, without exposing the record's contents.
;; 2. Reward points: a simple point tracker for healthy actions
;;    (reading a tip, uploading a record, etc). This is a demo
;;    mechanic — points are self-reported by the connected
;;    wallet, not independently verified.
;; ============================================================

(define-constant err-already-registered (err u100))

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

;; ---------- Record verification ----------

;; Store the hash of a health record on-chain. Fails harmlessly
;; if this exact hash was already registered (e.g. duplicate
;; upload), so a record can't be silently overwritten.
(define-public (store-record-hash (record-hash (buff 32)))
  (if (map-insert health-records-registry
        { record-hash: record-hash }
        { owner: tx-sender, registered-at: block-height })
      (ok true)
      err-already-registered))

;; Look up a previously registered hash. Returns none if this
;; hash has never been stored.
(define-read-only (get-record (record-hash (buff 32)))
  (map-get? health-records-registry { record-hash: record-hash }))

;; ---------- Reward points ----------

;; Award points to the caller for a healthy action. Demo-only:
;; self-reported, not gated by any off-chain proof.
(define-public (earn-points (amount uint))
  (let ((current (default-to { points: u0 }
                    (map-get? reward-points { user: tx-sender }))))
    (map-set reward-points
      { user: tx-sender }
      { points: (+ (get points current) amount) })
    (ok (+ (get points current) amount))))

(define-read-only (get-points (user principal))
  (default-to { points: u0 } (map-get? reward-points { user: user })))
