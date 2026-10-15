export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/Authentication/login",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}