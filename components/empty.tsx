import Image from "next/image";

interface EmptyProps {
  label: string;
}

export const Empty = ({ label }) => {
  return (
    <div className="h-full p-20 flex flex-col items-center justify-center">
      <div className="relative w-144">
        <Image
          className="rounded-3xl object-cover mb-2"
          alt="Empty"
          src="/empty.png"
          width={6016}
          height={4000}
        />
      </div>
      <p className="text-muted-foreground text-sm text-center">{label}</p>
    </div>
  );
};
