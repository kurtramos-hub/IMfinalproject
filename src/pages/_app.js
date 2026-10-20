import "../styles/globals.css"; // use your real file name
import StaffLayout from "../components/StaffLayout";

export default function App({ Component, pageProps }) {
  const page = <Component {...pageProps} />;
  const layout = Component.layout;
  return layout ? <StaffLayout {...layout}>{page}</StaffLayout> : page;
}