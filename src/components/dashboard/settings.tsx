import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Database, Download, Trash2, LogOut, Shield, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SettingsProps {
  onSignOut: () => void;
}

export function Settings({ onSignOut }: SettingsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!interactions) {
        toast({
          title: "No data to export",
          description: "You don't have any interactions to export.",
        });
        return;
      }

      // Convert to CSV
      const headers = ['Date', 'Time', 'Location', 'Age Range', 'Ethnicity', 'Rating', 'Quality', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...interactions.map(i => [
          i.date,
          i.time,
          i.location || '',
          i.age_range,
          i.ethnicity,
          i.attractiveness_rating,
          i.interaction_quality,
          `"${(i.notes || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-tracker-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a CSV file.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Unable to export your data.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete interactions
      const { error: interactionsError } = await supabase
        .from('interactions')
        .delete()
        .eq('user_id', user.id);

      if (interactionsError) throw interactionsError;

      // Delete user stats
      const { error: statsError } = await supabase
        .from('user_stats')
        .delete()
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      toast({
        title: "All data deleted",
        description: "Your interaction history has been permanently removed.",
      });
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: "Delete failed",
        description: "Unable to delete your data.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 pb-20 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account Section */}
      <Card className="interactive-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full justify-start tap-target"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="interactive-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleExportData}
            variant="outline"
            className="w-full justify-start tap-target"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data (CSV)
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start tap-target text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Data</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your 
                  interaction history, statistics, and personal data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete All Data"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="interactive-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Data Privacy</p>
                <p>All your data is stored securely and privately. We never share your personal interaction data with third parties.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Local Storage</p>
                <p>Your data stays in your secure account and is never used for advertising or sold to others.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="interactive-card">
        <CardContent className="pt-6 text-center">
          <h3 className="font-semibold text-primary mb-2">Social Tracker</h3>
          <p className="text-sm text-muted-foreground">
            Version 1.0 • Built for personal growth and social confidence
          </p>
        </CardContent>
      </Card>
    </div>
  );
}