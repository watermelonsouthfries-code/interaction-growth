import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Target, Award, RefreshCw, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  title: string;
  message: string;
  suggestion: string;
  type: 'progress' | 'pattern' | 'suggestion' | 'achievement';
}

interface InsightsData {
  insights: Insight[];
}

export function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights');
      
      if (error) {
        console.error('Error calling insights function:', error);
        throw error;
      }

      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
      } else {
        console.error('Invalid insights data format:', data);
        throw new Error('Invalid insights data format');
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      toast({
        title: "Error loading insights",
        description: "Using default insights. Try refreshing later.",
        variant: "destructive",
      });
      
      // Fallback insights
      setInsights([
        {
          title: "Start Your Journey",
          message: "Every social expert was once a beginner. Building confidence takes time and practice.",
          suggestion: "Start with small interactions - even a simple greeting counts as progress.",
          type: "suggestion"
        },
        {
          title: "Consistency is Key",
          message: "Regular practice is more valuable than perfect performance.",
          suggestion: "Aim for at least one social interaction each day to build momentum.",
          type: "progress"
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInsights();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'progress': return TrendingUp;
      case 'pattern': return Brain;
      case 'suggestion': return Lightbulb;
      case 'achievement': return Award;
      default: return Target;
    }
  };

  const getInsightBadgeColor = (type: string) => {
    switch (type) {
      case 'progress': return 'quality-good';
      case 'pattern': return 'bg-primary text-primary-foreground';
      case 'suggestion': return 'quality-neutral';
      case 'achievement': return 'quality-good';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <Brain className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <p className="text-sm text-muted-foreground">
            Personalized feedback based on your interactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="tap-target"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Insights Cards */}
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          return (
            <Card key={index} className="interactive-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                  </div>
                  <Badge className={getInsightBadgeColor(insight.type)}>
                    {insight.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight.message}
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-primary">
                      {insight.suggestion}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Motivational Footer */}
      <Card className="interactive-card gradient-primary">
        <CardContent className="p-6 text-center">
          <Brain className="h-8 w-8 text-primary-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-primary-foreground mb-2">
            Keep Growing!
          </h3>
          <p className="text-sm text-primary-foreground/90">
            Every interaction is a step forward in building your social confidence. 
            Trust the process and celebrate small wins!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}