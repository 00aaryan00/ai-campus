export default function Error({ message }: { message: string }) {
  return (
    <div className="text-center mt-10">
      <h2 className="text-accent-rose text-xl font-semibold">Error</h2>
      <p className="text-slate-500 dark:text-slate-400 mt-2">{message}</p>
    </div>
  );
}
