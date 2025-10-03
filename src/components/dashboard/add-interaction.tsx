import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddInteractionProps {
  onBack: () => void;
  onSuccess: () => void;
  editingId?: string;
}

export function AddInteraction({ onBack, onSuccess, editingId }: AddInteractionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    ageRange: "",
    ethnicity: "",
    attractivenessRating: [5],
    interactionQuality: "",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (editingId) {
      loadInteraction();
    }
  }, [editingId]);

  const loadInteraction = async () => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('id', editingId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          date: data.date,
          time: data.time,
          location: data.location || "",
          ageRange: data.age_range || "",
          ethnicity: data.ethnicity || "",
          attractivenessRating: [data.attractiveness_rating],
          interactionQuality: data.interaction_quality || "",
          notes: data.notes || "",
        });
      }
    } catch (error) {
      console.error('Error loading interaction:', error);
      toast({
        title: "Error loading interaction",
        description: "Unable to load interaction details",
        variant: "destructive",
      });
    }
  };

  const ageRanges = ["Under 18", "18-24", "25-34", "35-44", "45+"];
  const ethnicities = ["White", "Black", "Hispanic/Latino", "Asian", "Middle Eastern", "Mixed", "Other"];
  const qualities = ["Good", "Neutral", "Bad"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const interactionData = {
        user_id: user.id,
        date: formData.date,
        time: formData.time,
        location: formData.location || null,
        age_range: formData.ageRange || null,
        ethnicity: formData.ethnicity || null,
        attractiveness_rating: formData.attractivenessRating[0],
        interaction_quality: formData.interactionQuality || null,
        notes: formData.notes || null,
      };

      let error;
      if (editingId) {
        ({ error } = await supabase
          .from('interactions')
          .update(interactionData)
          .eq('id', editingId));
      } else {
        ({ error } = await supabase
          .from('interactions')
          .insert(interactionData));
      }

      if (error) throw error;

      toast({
        title: editingId ? "Interaction updated!" : "Interaction logged!",
        description: editingId 
          ? "Your interaction has been successfully updated."
          : "Your interaction has been successfully recorded.",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error saving interaction:', error);
      toast({
        title: editingId ? "Error updating interaction" : "Error saving interaction",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityBadgeClass = (quality: string) => {
    switch (quality) {
      case "Good": return "quality-good";
      case "Neutral": return "quality-neutral";
      case "Bad": return "quality-bad";
      default: return "";
    }
  };

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="tap-target">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{editingId ? "Edit Interaction" : "Add Interaction"}</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date and Time */}
        <Card className="interactive-card">
          <CardHeader>
            <CardTitle className="text-base">When & Where</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="tap-target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                  className="tap-target"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="Coffee shop, gym, park..."
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="tap-target"
              />
            </div>
          </CardContent>
        </Card>

        {/* Person Details */}
        <Card className="interactive-card">
          <CardHeader>
            <CardTitle className="text-base">Person Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Age Range</Label>
              <Select
                value={formData.ageRange} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, ageRange: value }))}
              >
                <SelectTrigger className="tap-target">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  {ageRanges.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ethnicity</Label>
              <Select
                value={formData.ethnicity} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, ethnicity: value }))}
              >
                <SelectTrigger className="tap-target">
                  <SelectValue placeholder="Select ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  {ethnicities.map((ethnicity) => (
                    <SelectItem key={ethnicity} value={ethnicity}>{ethnicity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Attractiveness Rating</Label>
              <div className="px-2">
                <Slider
                  value={formData.attractivenessRating}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, attractivenessRating: value }))}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span className="font-semibold text-primary">{formData.attractivenessRating[0]}</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interaction Quality */}
        <Card className="interactive-card">
          <CardHeader>
            <CardTitle className="text-base">How did it go?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {qualities.map((quality) => (
                <Button
                  key={quality}
                  type="button"
                  variant={formData.interactionQuality === quality ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, interactionQuality: quality }))}
                  className={`tap-target ${
                    formData.interactionQuality === quality ? getQualityBadgeClass(quality) : ""
                  } ${quality === "Bad" ? "active:bg-destructive active:text-destructive-foreground" : ""}`}
                >
                  {quality}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How did the conversation go? What did you learn?"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full tap-target h-14 text-lg font-semibold gradient-primary"
        >
          <Save className="mr-2 h-5 w-5" />
          {isLoading ? "Saving..." : (editingId ? "Update Interaction" : "Save Interaction")}
        </Button>
      </form>
    </div>
  );
}