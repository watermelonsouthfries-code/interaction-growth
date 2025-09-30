import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Calendar, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, eachDayOfInterval } from "date-fns";

interface AnalyticsData {
  dailyData: Array<{ date: string; interactions: number }>;
  qualityData: Array<{ name: string; value: number; color: string }>;
  avgRating: number;
  totalInteractions: number;
  avgPerDay: number;
  avgPerWeek: number;
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    dailyData: [],
    qualityData: [],
    avgRating: 0,
    totalInteractions: 0,
    avgPerDay: 0,
    avgPerWeek: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 30 days of interactions
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!interactions) {
        setIsLoading(false);
        return;
      }

      // Prepare daily data (last 30 days)
      const dateRange = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const dailyData = dateRange.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayInteractions = interactions.filter(i => i.date === dateStr);
        return {
          date: format(date, 'MMM d'),
          interactions: dayInteractions.length,
        };
      });

      // Prepare quality data
      const qualityGroups = interactions.reduce((acc, interaction) => {
        acc[interaction.interaction_quality] = (acc[interaction.interaction_quality] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const qualityColors = {
        Good: 'hsl(var(--success))',
        Neutral: 'hsl(var(--warning))',
        Bad: 'hsl(var(--destructive))',
      };

      const qualityData = Object.entries(qualityGroups).map(([name, value]) => ({
        name,
        value,
        color: qualityColors[name as keyof typeof qualityColors] || 'hsl(var(--muted))',
      }));

      // Calculate averages
      const avgRating = interactions.length > 0 
        ? interactions.reduce((sum, i) => sum + i.attractiveness_rating, 0) / interactions.length
        : 0;

      const totalInteractions = interactions.length;
      const avgPerDay = totalInteractions / 30;
      const avgPerWeek = avgPerDay * 7;

      setData({
        dailyData,
        qualityData,
        avgRating: Math.round(avgRating * 10) / 10,
        totalInteractions,
        avgPerDay: Math.round(avgPerDay * 10) / 10,
        avgPerWeek: Math.round(avgPerWeek * 10) / 10,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Unable to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="interactive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.totalInteractions}</div>
            <p className="text-xs text-muted-foreground">interactions (30 days)</p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.avgRating}</div>
            <p className="text-xs text-muted-foreground">attractiveness rating</p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Daily Avg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.avgPerDay}</div>
            <p className="text-xs text-muted-foreground">per day</p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Weekly Avg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.avgPerWeek}</div>
            <p className="text-xs text-muted-foreground">per week</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Interactions Chart */}
      <Card className="interactive-card">
        <CardHeader>
          <CardTitle className="text-base">Daily Interactions (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="interactions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Interaction Quality Breakdown */}
      {data.qualityData.length > 0 && (
        <Card className="interactive-card">
          <CardHeader>
            <CardTitle className="text-base">Interaction Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.qualityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {data.qualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}