type ChatBubbleProps = {
  text: string;
};

/** Speech bubble anchored to a player's card via its `relative` parent wrapper. */
export default function ChatBubble({ text }: ChatBubbleProps) {
  return (
    <div className="absolute -top-3 right-0 z-50 w-max max-w-[16rem] -translate-y-full">
      <div className="whitespace-normal rounded-2xl rounded-br-sm bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg">
        {text}
      </div>
      <div className="ml-auto mr-2 h-2 w-2 rotate-45 bg-slate-900" />
    </div>
  );
}
