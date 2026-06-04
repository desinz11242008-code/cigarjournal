import { Settings2 } from "lucide-react";

const Settings = () => (
  <div className="relative min-h-full">
    <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

    <div className="relative mx-auto w-full max-w-lg px-4">
      <header className="safe-top pb-4 pt-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
          Settings
        </h1>
      </header>

      <div className="animate-scale-in mt-20 flex flex-col items-center text-center">
        <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
          <Settings2 size={32} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Coming Soon
        </h2>
        <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
          Customise your journal, manage preferences, and configure your
          profile.
        </p>
      </div>
    </div>
  </div>
);

export default Settings;
