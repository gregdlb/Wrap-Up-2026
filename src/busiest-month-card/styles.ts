/**
 * Styles of BusiestMonthCard. Geometry is the Figma "Months card" frame, 360 x 350.
 * Every length is a multiple of --wu-u, the size of one Figma pixel, which the component sets
 * so that the whole frame fits its container.
 */
export const BUSIEST_MONTH_CARD_STYLES = /* css */ `
.wu-busiest-month-card {
  --wu-u: 1px;

  position: relative;
  width: 100%;
  height: 100%;
  font-family: var(--wu-font-sans, 'Rethink Sans', system-ui, sans-serif);
  font-synthesis: none;
  -webkit-user-select: none;
  user-select: none;
}

/* The Figma frame, centred in the container. */
.wu-busiest-month-card__stage {
  position: absolute;
  inset: 0;
  width: calc(360 * var(--wu-u));
  height: calc(350 * var(--wu-u));
  margin: auto;
}

.wu-busiest-month-card__page {
  position: absolute;
  background: var(--beige-50, #fefdfc);
  border-radius: calc(14 * var(--wu-u));
  box-shadow: 0 calc(16 * var(--wu-u)) calc(30 * var(--wu-u)) 0 rgba(3, 26, 13, 0.16);
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-busiest-month-card__page--back {
  left: calc(88 * var(--wu-u));
  top: calc(110 * var(--wu-u));
  width: calc(183.146 * var(--wu-u));
  height: calc(202 * var(--wu-u));
}

.wu-busiest-month-card__page--middle {
  left: calc(81 * var(--wu-u));
  top: calc(85 * var(--wu-u));
  width: calc(198.56 * var(--wu-u));
  height: calc(219 * var(--wu-u));
}

.wu-busiest-month-card__page--front {
  left: calc(73 * var(--wu-u));
  top: calc(60 * var(--wu-u));
  width: calc(214 * var(--wu-u));
  height: calc(236.029 * var(--wu-u));
}

.wu-busiest-month-card__stat {
  position: absolute;
  left: calc(16.25 * var(--wu-u));
  top: calc(21 * var(--wu-u));
  display: flex;
  align-items: flex-start;
  gap: calc(8 * var(--wu-u));
  white-space: nowrap;
}

/* Digits of equal width keep the number steady while it counts; the unit follows 8 px behind it. */
.wu-busiest-month-card__value {
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: calc(39 * var(--wu-u));
}

.wu-busiest-month-card__unit {
  margin-top: calc(14 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(14 * var(--wu-u));
  font-weight: 500;
  line-height: calc(18 * var(--wu-u));
}

.wu-busiest-month-card__year {
  position: absolute;
  right: calc(16.25 * var(--wu-u));
  top: calc(31 * var(--wu-u));
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--olive-300, #dce7cf);
  color: var(--emerald-500, #023620);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
}

/* One column per bar: --wu-x and --wu-w place it, --wu-h is the bar's final height. */
.wu-busiest-month-card__column {
  position: absolute;
  left: calc(var(--wu-x) * var(--wu-u));
  top: 0;
  width: calc(var(--wu-w) * var(--wu-u));
  height: 100%;
}

.wu-busiest-month-card__bar {
  position: absolute;
  left: 0;
  bottom: calc(39.029 * var(--wu-u));
  width: 100%;
  height: calc(var(--wu-h) * var(--wu-p, 1) * var(--wu-u));
  overflow: hidden;
  border-radius: calc(4 * var(--wu-u)) calc(4 * var(--wu-u)) calc(2 * var(--wu-u)) calc(2 * var(--wu-u));
  background: var(--olive-300, #dce7cf);
}

.wu-busiest-month-card__bar-highlight {
  position: absolute;
  inset: 0;
  background: var(--brand-500, #066e3d);
  opacity: 0;
}

.wu-busiest-month-card__label {
  position: absolute;
  left: 0;
  top: calc(203 * var(--wu-u));
  width: 100%;
  display: grid;
  justify-content: center;
  justify-items: center;
  font-size: calc(10 * var(--wu-u));
  line-height: calc(13 * var(--wu-u));
  white-space: nowrap;
}

.wu-busiest-month-card__label > * {
  grid-area: 1 / 1;
}

.wu-busiest-month-card__label-text {
  color: var(--taupe-700, #6d615d);
  font-weight: 500;
}

.wu-busiest-month-card__label-highlight {
  color: var(--brand-500, #066e3d);
  font-weight: 700;
  opacity: 0;
}

/* Week bars are square in Figma and their labels are one size smaller. */
.wu-busiest-month-card[data-variant='busiest_week'] .wu-busiest-month-card__bar {
  border-radius: 0;
}

.wu-busiest-month-card[data-variant='busiest_week'] .wu-busiest-month-card__label {
  top: calc(205 * var(--wu-u));
  font-size: calc(9 * var(--wu-u));
  line-height: calc(12 * var(--wu-u));
}
`;
