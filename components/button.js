export default function Button({ children, disabled }) {
  return (
    <button
      disabled={disabled}
      className="w-full bg-blue-500 hover:bg-blue-dark text-white font-bold py-2 px-4 rounded-md"
      type="submit"
    >
      {children}
    </button>
  );
}
