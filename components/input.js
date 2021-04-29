export default function Input({
  className,
  label,
  type,
  name,
  placeholder,
  value,
  onChange,
  error
}) {
  return (
    <div className={className}>
      <label
        className="block text-grey-darker text-sm font-bold mb-2"
        htmlFor={name}
      >
        {label}
      </label>
      <input
        className="appearance-none border rounded w-full py-2 px-3 text-grey-darker"
        id={name}
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
      />
      {error && <p className="text-red-500 text-xs italic">{error}</p>}
    </div>
  );
}
