"use client";

import { CalendarPlus } from "lucide-react";
import { recordTalk } from "@/app/actions";

export function TalkButton({ postId, href }: { postId: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary btn-sm"
      onClick={() => {
        void recordTalk(postId);
      }}
    >
      <CalendarPlus size={16} aria-hidden /> Let&apos;s talk
    </a>
  );
}
