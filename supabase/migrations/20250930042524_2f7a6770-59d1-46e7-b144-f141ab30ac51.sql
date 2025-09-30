-- Create interactions table for tracking social interactions
CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  location TEXT,
  age_range TEXT NOT NULL CHECK (age_range IN ('Under 18', '18-24', '25-34', '35-44', '45+')),
  ethnicity TEXT NOT NULL CHECK (ethnicity IN ('White', 'Black', 'Hispanic/Latino', 'Asian', 'Middle Eastern', 'Mixed', 'Other')),
  attractiveness_rating INTEGER NOT NULL CHECK (attractiveness_rating >= 1 AND attractiveness_rating <= 10),
  interaction_quality TEXT NOT NULL CHECK (interaction_quality IN ('Good', 'Neutral', 'Bad')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own interactions" 
ON public.interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions" 
ON public.interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" 
ON public.interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" 
ON public.interactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_interactions_user_date ON public.interactions(user_id, date DESC);
CREATE INDEX idx_interactions_created_at ON public.interactions(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_interactions_updated_at
BEFORE UPDATE ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_stats table for tracking streaks and aggregations
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_interactions INTEGER NOT NULL DEFAULT 0,
  last_interaction_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user stats
CREATE POLICY "Users can view their own stats" 
ON public.user_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for user stats timestamps
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update user stats when an interaction is added
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    days_since_last INTEGER;
BEGIN
    -- Get or create user stats record
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO user_record FROM public.user_stats WHERE user_id = NEW.user_id;
    
    -- Calculate streak
    IF user_record.last_interaction_date IS NULL THEN
        -- First interaction
        days_since_last := 0;
    ELSE
        days_since_last := NEW.date - user_record.last_interaction_date;
    END IF;
    
    -- Update stats
    UPDATE public.user_stats 
    SET 
        total_interactions = total_interactions + 1,
        last_interaction_date = NEW.date,
        current_streak = CASE 
            WHEN days_since_last <= 1 THEN current_streak + CASE WHEN days_since_last = 0 THEN 0 ELSE 1 END
            ELSE 1 
        END,
        longest_streak = GREATEST(longest_streak, CASE 
            WHEN days_since_last <= 1 THEN current_streak + CASE WHEN days_since_last = 0 THEN 0 ELSE 1 END
            ELSE 1 
        END),
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to update stats when interaction is added
CREATE TRIGGER update_stats_on_interaction
AFTER INSERT ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats();