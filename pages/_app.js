import "../styles/globals.css";
import "tailwindcss/tailwind.css";
import { ApolloProvider } from "@apollo/client";
import { useApollo } from "../lib/apollo";
import AuthProvider from "../lib/authContext";

function MyApp({ Component, pageProps }) {
  const apolloClient = useApollo(pageProps.initialApolloState);
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ApolloProvider>
  );
}


export default MyApp;
