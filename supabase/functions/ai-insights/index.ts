import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('Generating insights for user:', user.id);

    // Get user's interactions from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: interactions, error: interactionsError } = await supabaseClient
      .from('interactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
      throw new Error('Failed to fetch interactions');
    }

    // Get user stats
    const { data: userStats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
    }

    // Prepare data summary for AI analysis
    const totalInteractions = interactions?.length || 0;
    const avgRating = totalInteractions > 0 
      ? interactions!.reduce((sum, i) => sum + i.attractiveness_rating, 0) / totalInteractions
      : 0;

    const qualityBreakdown = interactions?.reduce((acc, i) => {
      acc[i.interaction_quality] = (acc[i.interaction_quality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const locationFrequency = interactions?.reduce((acc, i) => {
      if (i.location) {
        acc[i.location] = (acc[i.location] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const timePatterns = interactions?.reduce((acc, i) => {
      const hour = parseInt(i.time.split(':')[0]);
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Create a comprehensive prompt for AI analysis
    const prompt = `Analyze this social interaction data and provide encouraging, actionable insights:

User Stats:
- Total interactions (30 days): ${totalInteractions}
- Current streak: ${userStats?.current_streak || 0} days
- Average attractiveness rating: ${avgRating.toFixed(1)}/10
- Quality breakdown: ${JSON.stringify(qualityBreakdown)}
- Popular locations: ${JSON.stringify(locationFrequency)}
- Time patterns: ${JSON.stringify(timePatterns)}

Generate 3-4 motivational insights that are:
1. Encouraging and positive
2. Based on actual data patterns
3. Include specific suggestions for improvement
4. Focus on building confidence and social skills

Format as JSON with this structure:
{
  "insights": [
    {
      "title": "Insight Title",
      "message": "Encouraging message with specific data",
      "suggestion": "Actionable suggestion",
      "type": "progress" | "pattern" | "suggestion" | "achievement"
    }
  ]
}`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI for insights generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive social confidence coach. Generate encouraging insights based on user interaction data. Always be positive and motivational.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    let insights;
    try {
      // Parse the AI response to extract JSON
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback insights if AI parsing fails
      insights = {
        insights: [
          {
            title: "Keep Building Momentum",
            message: `You've logged ${totalInteractions} interactions in the last 30 days - that's meaningful progress!`,
            suggestion: "Try to maintain consistency by setting a daily goal of 1-2 interactions.",
            type: "progress"
          },
          {
            title: "Quality Improvement",
            message: totalInteractions > 0 
              ? `Your average rating is ${avgRating.toFixed(1)}/10, which shows you're engaging with interesting people.`
              : "Start with small interactions to build confidence.",
            suggestion: "Focus on genuine conversations rather than just the numbers.",
            type: "suggestion"
          }
        ]
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    
    // Return fallback insights on error
    const fallbackInsights = {
      insights: [
        {
          title: "Start Your Journey",
          message: "Every expert was once a beginner. Your social confidence will grow with each interaction.",
          suggestion: "Begin with small goals - even a simple 'hello' to a stranger counts as progress.",
          type: "suggestion"
        },
        {
          title: "Consistency Matters",
          message: "Building social skills is like building muscle - regular practice makes all the difference.",
          suggestion: "Try to have at least one meaningful social interaction each day.",
          type: "progress"
        }
      ]
    };

    return new Response(JSON.stringify(fallbackInsights), {
      status: (error instanceof Error && error.message.includes('authentication')) ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});