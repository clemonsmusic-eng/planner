interface Props {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading Symphonica…' }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-4xl animate-float">𝄞</div>
      <div className="w-8 h-8 border-2 border-academy-gold/30 border-t-academy-gold rounded-full animate-spin" />
      <p className="text-academy-cream/50 text-sm font-fantasy tracking-widest">{message}</p>
    </div>
  );
}
