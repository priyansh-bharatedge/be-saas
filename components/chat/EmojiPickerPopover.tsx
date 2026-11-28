"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Smile, ThumbsUp, Heart, Briefcase, Sparkles, X } from "lucide-react";

export interface EmojiItem {
  emoji: string;
  name: string;
  category: "smileys" | "gestures" | "hearts" | "objects";
}

const EMOJI_DATABASE: EmojiItem[] = [
  // Smileys & Emotion
  { emoji: "😀", name: "grinning face smile happy", category: "smileys" },
  { emoji: "😃", name: "smiley face big eyes happy", category: "smileys" },
  { emoji: "😄", name: "smile laughing joy happy", category: "smileys" },
  { emoji: "😁", name: "beaming grin proud happy", category: "smileys" },
  { emoji: "😆", name: "laughing closed eyes funny lol", category: "smileys" },
  { emoji: "😅", name: "sweat smile relief nervous", category: "smileys" },
  { emoji: "🤣", name: "rofl laughing rolling floor funny lmao", category: "smileys" },
  { emoji: "😂", name: "joy tears laughing cry lol funny", category: "smileys" },
  { emoji: "🙂", name: "slightly smiling calm ok", category: "smileys" },
  { emoji: "🙃", name: "upside down silly sarcasm", category: "smileys" },
  { emoji: "😉", name: "wink playful flirt subtle", category: "smileys" },
  { emoji: "😊", name: "blush warm happy smile", category: "smileys" },
  { emoji: "😇", name: "halo angel innocent blessed", category: "smileys" },
  { emoji: "🥰", name: "smiling hearts love adore sweet", category: "smileys" },
  { emoji: "😍", name: "heart eyes love crush gorgeous", category: "smileys" },
  { emoji: "🤩", name: "star struck excited amazing wow", category: "smileys" },
  { emoji: "😘", name: "kiss blow kiss love affection", category: "smileys" },
  { emoji: "😋", name: "yum delicious tongue tasty", category: "smileys" },
  { emoji: "😜", name: "winking tongue crazy funny", category: "smileys" },
  { emoji: "🤪", name: "zany wacky goofy party wild", category: "smileys" },
  { emoji: "😎", name: "sunglasses cool boss confident awesome", category: "smileys" },
  { emoji: "🤓", name: "nerd geek smart reading studious", category: "smileys" },
  { emoji: "🧐", name: "monocle inspecting curious hm investigate", category: "smileys" },
  { emoji: "🥳", name: "partying celebrate birthday cheer woohoo", category: "smileys" },
  { emoji: "😏", name: "smirk sly playful cocky knowing", category: "smileys" },
  { emoji: "😌", name: "relieved peaceful content calm", category: "smileys" },
  { emoji: "🤔", name: "thinking ponder hmm curious consider", category: "smileys" },
  { emoji: "🤫", name: "shh secret quiet silent hush", category: "smileys" },
  { emoji: "🤐", name: "zipper mouth sealed silent shut", category: "smileys" },
  { emoji: "🤨", name: "raised eyebrow skeptical doubt really", category: "smileys" },
  { emoji: "😐", name: "neutral poker face blank okay", category: "smileys" },
  { emoji: "😑", name: "expressionless done annoyed", category: "smileys" },
  { emoji: "😶", name: "no mouth speech silent speechless", category: "smileys" },
  { emoji: "🙄", name: "eye roll sigh duh whatever annoyed", category: "smileys" },
  { emoji: "😬", name: "grimacing awkward oof cringe tense", category: "smileys" },
  { emoji: "😮", name: "surprised wow open mouth shocked", category: "smileys" },
  { emoji: "😲", name: "astonished gasp whoa unbelievable", category: "smileys" },
  { emoji: "😳", name: "flushed blush startled wide eyes", category: "smileys" },
  { emoji: "🥺", name: "pleading begging puppy eyes please", category: "smileys" },
  { emoji: "😢", name: "crying tear sad upset hurt", category: "smileys" },
  { emoji: "😭", name: "loudly crying bawling devastated tears", category: "smileys" },
  { emoji: "😱", name: "screaming horror shock scared omg", category: "smileys" },
  { emoji: "🥱", name: "yawning tired sleepy bored exhausted", category: "smileys" },
  { emoji: "😤", name: "triumph steam haughty determined proud", category: "smileys" },
  { emoji: "😡", name: "pouting angry mad furious rage", category: "smileys" },
  { emoji: "🤯", name: "mind blown explode explosion shocked", category: "smileys" },

  // Gestures & People
  { emoji: "👍", name: "thumbs up like approve good yes done ok", category: "gestures" },
  { emoji: "👎", name: "thumbs down dislike no bad disagree", category: "gestures" },
  { emoji: "👌", name: "ok hand perfect agreed nice awesome", category: "gestures" },
  { emoji: "✌️", name: "peace victory two v sign", category: "gestures" },
  { emoji: "🤞", name: "crossed fingers luck hope wish fingers", category: "gestures" },
  { emoji: "🤟", name: "love you gesture rock on sign", category: "gestures" },
  { emoji: "🤙", name: "call me shaka hang loose chill", category: "gestures" },
  { emoji: "👋", name: "waving hand hello hi goodbye bye", category: "gestures" },
  { emoji: "👏", name: "clapping hands applause bravo congrats kudos", category: "gestures" },
  { emoji: "🙌", name: "raising hands praise hooray celebration", category: "gestures" },
  { emoji: "🤝", name: "handshake deal agreed partner teamwork welcome", category: "gestures" },
  { emoji: "🙏", name: "folded hands please thank you pray namaste respect", category: "gestures" },
  { emoji: "💪", name: "flexed biceps muscle strong power gym work", category: "gestures" },
  { emoji: "✍️", name: "writing hand pen signature notes drafting", category: "gestures" },
  { emoji: "👀", name: "eyes looking watching peek see examine", category: "gestures" },
  { emoji: "🫡", name: "saluting face respect yes sir acknowledged", category: "gestures" },
  { emoji: "👊", name: "fist bump bro pound respect punch", category: "gestures" },
  { emoji: "🤌", name: "pinched fingers italian what do you want gesture", category: "gestures" },

  // Hearts & Symbols
  { emoji: "❤️", name: "red heart love favorite like adore", category: "hearts" },
  { emoji: "🧡", name: "orange heart care warmth friendship", category: "hearts" },
  { emoji: "💛", name: "yellow heart happiness joy friendly", category: "hearts" },
  { emoji: "💚", name: "green heart nature organic health", category: "hearts" },
  { emoji: "💙", name: "blue heart trust loyalty corporate peace", category: "hearts" },
  { emoji: "💜", name: "purple heart luxury dignity glam", category: "hearts" },
  { emoji: "🖤", name: "black heart dark gothic sleek", category: "hearts" },
  { emoji: "🤍", name: "white heart pure peace clarity", category: "hearts" },
  { emoji: "💔", name: "broken heart sad break breakup pain", category: "hearts" },
  { emoji: "💖", name: "sparkling heart sparkle shiny love", category: "hearts" },
  { emoji: "💗", name: "growing heart pulse affection warmth", category: "hearts" },
  { emoji: "🔥", name: "fire flame lit hot incredible amazing trending", category: "hearts" },
  { emoji: "💯", name: "hundred points perfect score 100 facts truth", category: "hearts" },
  { emoji: "✨", name: "sparkles shiny clean new magic fresh awesome", category: "hearts" },
  { emoji: "🌟", name: "glowing star bright excellence winner stellar", category: "hearts" },
  { emoji: "⭐", name: "star favorite rating rating high quality", category: "hearts" },
  { emoji: "🎉", name: "party popper tada congrats celebration winner hooray", category: "hearts" },
  { emoji: "🎊", name: "confetti ball celebrate fiesta festive party", category: "hearts" },

  // Objects & Work
  { emoji: "🚀", name: "rocket launch deploy growth fast speed scale", category: "objects" },
  { emoji: "💡", name: "light bulb idea creative thinking solution innovation", category: "objects" },
  { emoji: "🎯", name: "direct hit target goal bullseye objective milestone", category: "objects" },
  { emoji: "🏆", name: "trophy winner champion 1st place award victory success", category: "objects" },
  { emoji: "📈", name: "chart increasing upward trend growth revenue profits", category: "objects" },
  { emoji: "📊", name: "bar chart analytics dashboard metrics report stats", category: "objects" },
  { emoji: "✅", name: "check mark button done completed verified approved task", category: "objects" },
  { emoji: "⚡", name: "high voltage lightning fast instant quick power energy", category: "objects" },
  { emoji: "📌", name: "pushpin pin important notice sticky highlight", category: "objects" },
  { emoji: "📎", name: "paperclip attachment file link document joined", category: "objects" },
  { emoji: "📝", name: "memo note write draft plan document checklist", category: "objects" },
  { emoji: "📅", name: "calendar date schedule event meeting deadline", category: "objects" },
  { emoji: "🕒", name: "clock time hour appointment reminder watch", category: "objects" },
  { emoji: "🔒", name: "locked secure safe privacy password encryption", category: "objects" },
  { emoji: "📢", name: "loudspeaker announcement broadcast news alert notice", category: "objects" },
  { emoji: "💻", name: "laptop computer tech dev coding software screen", category: "objects" },
  { emoji: "☕", name: "hot beverage coffee tea morning break relax meeting", category: "objects" },
];

const CATEGORIES = [
  { key: "all", label: "All", icon: Sparkles },
  { key: "smileys", label: "Smileys", icon: Smile },
  { key: "gestures", label: "Gestures", icon: ThumbsUp },
  { key: "hearts", label: "Hearts", icon: Heart },
  { key: "objects", label: "Work", icon: Briefcase },
] as const;

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  className?: string;
  title?: string;
}

export function EmojiPickerPopover({
  isOpen,
  onClose,
  onSelectEmoji,
  position = "top-left",
  className = "",
  title = "Choose Emoji",
}: EmojiPickerPopoverProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
      setActiveCategory("all");
    }
  }, [isOpen]);

  // Handle outside click & custom close event
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleCustomClose = () => {
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("chat:close-emoji-picker", handleCustomClose);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("chat:close-emoji-picker", handleCustomClose);
    };
  }, [isOpen, onClose]);

  // Filter emojis based on active category and search
  const filteredEmojis = useMemo(() => {
    const query = search.trim().toLowerCase();
    return EMOJI_DATABASE.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch = !query || item.name.includes(query) || item.emoji.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  if (!isOpen) return null;

  // Position classes
  let positionClasses = "bottom-full mb-3 left-0";
  if (position === "top-right") {
    positionClasses = "bottom-full mb-3 right-0";
  } else if (position === "bottom-left") {
    positionClasses = "top-full mt-2 left-0";
  } else if (position === "bottom-right") {
    positionClasses = "top-full mt-2 right-0";
  }

  return (
    <div
      ref={containerRef}
      data-emoji-picker="true"
      className={`absolute z-50 w-72 sm:w-80 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_16px_40px_rgba(0,0,0,0.12)] p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none ${positionClasses} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header & Close */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700 tracking-tight">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Close emoji picker"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200/80 focus:outline-none focus:border-[#588594] focus:ring-1 focus:ring-[#588594] text-slate-800 placeholder:text-slate-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      {!search && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-[#588594] text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="h-52 overflow-y-auto pr-1 grid grid-cols-7 sm:grid-cols-8 gap-1 content-start scroll-smooth">
        {filteredEmojis.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400">
            No emojis match &ldquo;{search}&rdquo;
          </div>
        ) : (
          filteredEmojis.map((item, idx) => (
            <button
              key={`${item.emoji}-${idx}`}
              type="button"
              onClick={() => {
                onSelectEmoji(item.emoji);
              }}
              title={item.name}
              className="h-8 w-8 flex items-center justify-center rounded-xl text-lg hover:bg-[#EBF3F6] hover:scale-115 active:scale-95 transition-all"
            >
              <span className="leading-none">{item.emoji}</span>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Click to insert</span>
        <span>{filteredEmojis.length} emojis</span>
      </div>
    </div>
  );
}
