import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MapPin, Users, Star, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Interaction {
  id: string;
  date: string;
  time: string;
  location: string | null;
  age_range: string;
  ethnicity: string;
  attractiveness_rating: number;
  interaction_quality: string;
  notes: string | null;
}

interface GroupedInteractions {
  [date: string]: Interaction[];
}

interface HistoryProps {
  onEdit?: (interactionId: string) => void;
}

export function History({ onEdit }: HistoryProps = {}) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInteractions();
  }, []);

  const loadInteractions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
      toast({
        title: "Error loading history",
        description: "Unable to load interaction history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groupedInteractions = interactions.reduce<GroupedInteractions>((acc, interaction) => {
    const date = interaction.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(interaction);
    return acc;
  }, {});

  const getQualityBadgeClass = (quality: string) => {
    switch (quality) {
      case "Good": return "quality-good";
      case "Neutral": return "quality-neutral";
      case "Bad": return "quality-bad";
      default: return "";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return format(date, "EEEE, MMM d");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold mb-6">History</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">History</h1>
      
      {interactions.length === 0 ? (
        <Card className="interactive-card">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No interactions yet</h3>
            <p className="text-muted-foreground">
              Start logging your social interactions to see them here!
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-6">
            {Object.entries(groupedInteractions).map(([date, dayInteractions]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Calendar className="h-4 w-4" />
                  {formatDate(date)}
                  <Badge variant="secondary" className="ml-auto">
                    {dayInteractions.length} interaction{dayInteractions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {dayInteractions.map((interaction) => (
                    <Card key={interaction.id} className="interactive-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {format(new Date(`1970-01-01T${interaction.time}`), 'h:mm a')}
                            {interaction.location && (
                              <>
                                <span>•</span>
                                <MapPin className="h-4 w-4" />
                                {interaction.location}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {interaction.interaction_quality && (
                              <Badge className={getQualityBadgeClass(interaction.interaction_quality)}>
                                {interaction.interaction_quality}
                              </Badge>
                            )}
                            {onEdit && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEdit(interaction.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {(interaction.age_range || interaction.ethnicity) && (
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            {interaction.age_range && (
                              <div>
                                <span className="text-muted-foreground">Age:</span>
                                <span className="ml-1 font-medium">{interaction.age_range}</span>
                              </div>
                            )}
                            {interaction.ethnicity && (
                              <div>
                                <span className="text-muted-foreground">Ethnicity:</span>
                                <span className="ml-1 font-medium">{interaction.ethnicity}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Rating:</span>
                          <span className="font-semibold text-primary">
                            {interaction.attractiveness_rating}/10
                          </span>
                        </div>
                        
                        {interaction.notes && (
                          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            "{interaction.notes}"
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}