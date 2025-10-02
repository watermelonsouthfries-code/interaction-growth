import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/ui/auth-form";
import { Home } from "@/components/dashboard/home";
import { AddInteraction } from "@/components/dashboard/add-interaction";
import { History } from "@/components/dashboard/history";
import { Analytics } from "@/components/dashboard/analytics";
import { Insights } from "@/components/dashboard/insights";
import { Settings } from "@/components/dashboard/settings";
import { BottomNav } from "@/components/dashboard/bottom-nav";

const Index = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("home");
  const [editingInteractionId, setEditingInteractionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = () => {
    setUser(null);
    setCurrentView("home");
  };

  const handleAddInteractionSuccess = () => {
    setEditingInteractionId(undefined);
    setCurrentView("home");
  };

  const handleEditInteraction = (interactionId: string) => {
    setEditingInteractionId(interactionId);
    setCurrentView("add");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => setCurrentView("home")} />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "home":
        return <Home onAddInteraction={() => {
          setEditingInteractionId(undefined);
          setCurrentView("add");
        }} />;
      case "add":
        return (
          <AddInteraction
            onBack={() => {
              setEditingInteractionId(undefined);
              setCurrentView("home");
            }}
            onSuccess={handleAddInteractionSuccess}
            editingId={editingInteractionId}
          />
        );
      case "history":
        return <History onEdit={handleEditInteraction} />;
      case "analytics":
        return <Analytics />;
      case "insights":
        return <Insights />;
      case "settings":
        return <Settings onSignOut={handleSignOut} />;
      default:
        return <Home onAddInteraction={() => {
          setEditingInteractionId(undefined);
          setCurrentView("add");
        }} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto relative">
        {renderCurrentView()}
        <BottomNav currentView={currentView} onViewChange={setCurrentView} />
      </div>
    </div>
  );
};

export default Index;
