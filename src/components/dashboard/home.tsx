import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HomeProps {
  onAddInteraction: () => void;
}

interface DashboardStats {
  todayCount: number;
  currentStreak: number;
  thisWeekCount: number;
  lastWeekCount: number;
}

export function Home({ onAddInteraction }: HomeProps) {
  const [stats, setStats] = useState<DashboardStats>({
    todayCount: 0,
    currentStreak: 0,
    thisWeekCount: 0,
    lastWeekCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get today's count
      const today = new Date().toISOString().split('T')[0];
      const { data: todayInteractions } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today);

      // Get user stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();

      // Get this week's count
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const { data: thisWeekInteractions } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', weekStartStr);

      // Get last week's count
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      
      const { data: lastWeekInteractions } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', lastWeekStart.toISOString().split('T')[0])
        .lte('date', lastWeekEnd.toISOString().split('T')[0]);

      setStats({
        todayCount: todayInteractions?.length || 0,
        currentStreak: userStats?.current_streak || 0,
        thisWeekCount: thisWeekInteractions?.length || 0,
        lastWeekCount: lastWeekInteractions?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Error loading stats",
        description: "Unable to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const weekComparison = stats.thisWeekCount - stats.lastWeekCount;
  const weekTrend = weekComparison >= 0 ? 'up' : 'down';

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Today's Counter - Main Feature */}
      <Card className="interactive-card text-center gradient-primary">
        <CardContent className="pt-8 pb-8">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-primary-foreground opacity-90">
              Today's Interactions
            </h2>
            <div className="text-6xl font-bold text-primary-foreground">
              {isLoading ? "..." : stats.todayCount}
            </div>
            <p className="text-primary-foreground/80 text-sm">
              {stats.todayCount === 0 ? "Let's get started!" : "Keep it up!"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Button */}
      <Button 
        onClick={onAddInteraction}
        className="w-full tap-target h-14 text-lg font-semibold gradient-primary"
      >
        <Plus className="mr-2 h-6 w-6" />
        Add Interaction
      </Button>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="interactive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? "..." : stats.currentStreak}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.currentStreak === 1 ? "day" : "days"}
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? "..." : stats.thisWeekCount}
            </div>
            <div className={`text-xs flex items-center gap-1 ${
              weekTrend === 'up' ? 'text-success' : 'text-muted-foreground'
            }`}>
              <TrendingUp className={`h-3 w-3 ${
                weekTrend === 'down' ? 'rotate-180' : ''
              }`} />
              {weekComparison === 0 ? 'Same as last week' : 
               weekComparison > 0 ? `+${weekComparison} from last week` :
               `${weekComparison} from last week`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Section */}
      <Card className="interactive-card">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-primary">Daily Goal</h3>
            <p className="text-sm text-muted-foreground">
              {stats.todayCount === 0 
                ? "Start your day with one meaningful interaction"
                : stats.todayCount < 3 
                ? "You're off to a great start! Try for one more"
                : "Excellent! You're building real confidence"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}