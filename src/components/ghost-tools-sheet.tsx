import { useRef } from "react";
import { BookOpen, Camera, Clapperboard, ImagePlus, Images, Orbit, Paperclip, SquarePen } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { compressImage } from "@/lib/device-permissions";
import { readGhostFile } from "@/lib/ghost-files";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrompt: (text: string) => void;
  onImage: (dataUrl: string) => void;
  onFileText: (name: string, body: string) => void;
  onStudio: () => void;
};

export function ToolsSheet({ open, onOpenChange, onPrompt, onImage, onFileText, onStudio }: Props) {
  const photos = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    try {
      const read = await readGhostFile(file);
      if (read.kind === "image") onImage(await compressImage(file));
      else if (read.kind === "pdf") {
        if (file.size > 2 * 1024 * 1024) throw new Error("For website chat, choose a PDF under 2 MB; Telegram accepts up to 20 MB.");
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") onImage(reader.result); };
        reader.readAsDataURL(read.file);
      } else {
        if (read.text.length > 20000) throw new Error("Split this document into smaller files under 20,000 characters for website chat.");
        onFileText(file.name, read.text);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to read this file."); }
  }

  const tools = [
    { icon: ImagePlus, title: "Create images", sub: "Visualise and edit", run: () => onPrompt("Create an image of ") },
    { icon: Clapperboard, title: "Create videos", sub: "Bring ideas to life", run: () => onPrompt("Make a video of ") },
    { icon: SquarePen, title: "Canvas", sub: "Code, write or make slides", run: () => onPrompt("Write code for ") },
    { icon: Orbit, title: "Deep Research", sub: "Get detailed reports", run: () => onPrompt("Research deeply and give me a detailed report on ") },
    { icon: BookOpen, title: "Guided Learning", sub: "Get step-by-step help", run: () => onPrompt("Teach me step by step: ") },
    { icon: Images, title: "Image studio", sub: "Your saved images and edits", run: onStudio },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="tools-sheet">
        <SheetTitle className="sr-only">Ghost tools</SheetTitle>
        <SheetDescription className="sr-only">Attach something or pick a tool</SheetDescription>
        <div className="tools-grab" aria-hidden />
        <div className="tools-tiles">
          <button type="button" onClick={() => photos.current?.click()}><ImagePlus /><span>Photos</span></button>
          <button type="button" onClick={() => camera.current?.click()}><Camera /><span>Camera</span></button>
          <button type="button" onClick={() => files.current?.click()}><Paperclip /><span>Files</span></button>
        </div>
        <ul className="tools-list">
          {tools.map((t) => (
            <li key={t.title}>
              <button type="button" onClick={t.run}>
                <t.icon />
                <span><strong>{t.title}</strong><small>{t.sub}</small></span>
              </button>
            </li>
          ))}
        </ul>
        <input ref={photos} hidden type="file" accept="image/*" onChange={(e) => void take(e.target.files?.[0])} />
        <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={(e) => void take(e.target.files?.[0])} />
        <input ref={files} hidden type="file" accept="image/png,image/jpeg,image/webp,.pdf,.docx,.pptx,.xlsx,.odt,.ods,.odp,.txt,.md,.csv,.json,.xml,.yaml,.js,.ts,.tsx,.py,.html,.css" onChange={(e) => void take(e.target.files?.[0])} />
      </SheetContent>
    </Sheet>
  );
}
