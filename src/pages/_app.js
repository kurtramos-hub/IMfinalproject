import StaffLayout from "../components/StaffLayout";

export default function App({ Component, pageProps }) {
  const page = <Component {...pageProps} />;

  // Pages that define `Page.layout = {...}` get the staff sidebar.
  // Because it is rendered here, the sidebar stays mounted between pages.
  const layout = Component.layout;
  return layout ? <StaffLayout {...layout}>{page}</StaffLayout> : page;
}