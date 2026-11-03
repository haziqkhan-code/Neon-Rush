export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { display: ['Orbitron', 'system-ui', 'sans-serif'], body: ['"Space Grotesk"', 'system-ui', 'sans-serif'] },
    colors: { ink: '#05060f', neon: { cyan: '#22f3ff', blue: '#3d7bff', purple: '#a24bff', pink: '#ff3d9a' } },
  } },
  plugins: [],
}
