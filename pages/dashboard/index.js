import { useAuth } from "../../lib/authContext";

export default function DashboardScreen() {
  const auth = useAuth();
  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center">
      <a
        href="/auth/login"
        className="w-1/2 text-center bg-blue-500 hover:bg-blue-dark text-white hover:bg-blue-700 font-bold py-2 px-4 rounded-md"
      >
        Login to your account
      </a>
      <a
        href="/auth/signup"
        className="w-1/2 text-center text-blue-500 hover:bg-blue-dark bg-gray-50 hover:text-blue-700 font-bold py-2 px-4 mt-2 rounded-md"
      >
        Create an account
      </a>
    </div>
  );
}
