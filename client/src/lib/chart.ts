import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

let registered = false;

export function registerChartJs() {
  if (registered) return;
  ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
    Legend,
    Title
  );
  registered = true;
}
