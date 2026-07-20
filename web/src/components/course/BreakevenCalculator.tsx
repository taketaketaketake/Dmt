import { useState } from "react";
import styles from "./BreakevenCalculator.module.css";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Interactive companion to the breakeven section of the P&L lesson:
 * Breakeven units = Fixed Costs / (Price per Unit − Variable Cost per Unit).
 */
export function BreakevenCalculator() {
  const [fixedCosts, setFixedCosts] = useState("10000");
  const [price, setPrice] = useState("50");
  const [variableCost, setVariableCost] = useState("20");

  const f = parseFloat(fixedCosts);
  const p = parseFloat(price);
  const v = parseFloat(variableCost);
  const valid = f >= 0 && p > 0 && v >= 0;
  const margin = p - v;

  let result: { units: number; revenue: number } | null = null;
  if (valid && margin > 0) {
    const units = Math.ceil(f / margin);
    result = { units, revenue: units * p };
  }

  return (
    <div className={styles.calculator}>
      <p className={styles.heading}>Breakeven calculator</p>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Fixed costs (per period)</span>
          <input
            type="number"
            min="0"
            value={fixedCosts}
            onChange={(e) => setFixedCosts(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Price per unit</span>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Variable cost per unit</span>
          <input
            type="number"
            min="0"
            value={variableCost}
            onChange={(e) => setVariableCost(e.target.value)}
          />
        </label>
      </div>

      {!valid ? (
        <p className={styles.note}>Enter your numbers above to see your breakeven point.</p>
      ) : margin <= 0 ? (
        <p className={styles.note}>
          Your price per unit must be higher than your variable cost per unit — right now
          every sale loses money, so there is no breakeven point.
        </p>
      ) : (
        <div className={styles.results}>
          <div className={styles.result}>
            <span className={styles.resultValue}>{result!.units.toLocaleString()}</span>
            <span className={styles.resultLabel}>units to break even</span>
          </div>
          <div className={styles.result}>
            <span className={styles.resultValue}>{fmt.format(result!.revenue)}</span>
            <span className={styles.resultLabel}>breakeven revenue</span>
          </div>
          <div className={styles.result}>
            <span className={styles.resultValue}>{fmt.format(margin)}</span>
            <span className={styles.resultLabel}>contribution margin per unit</span>
          </div>
        </div>
      )}
    </div>
  );
}
