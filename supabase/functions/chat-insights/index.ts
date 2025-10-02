import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    const { messages } = await req.json();
    console.log('Chat request from user:', user.id);

    // Get user's recent interactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: interactions, error: interactionsError } = await supabaseClient
      .from('interactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
      throw new Error('Failed to fetch interactions');
    }

    // Get user stats
    const { data: userStats } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Prepare context about user's data
    const totalInteractions = interactions?.length || 0;
    const avgRating = totalInteractions > 0 
      ? interactions!.reduce((sum, i) => sum + i.attractiveness_rating, 0) / totalInteractions
      : 0;

    const todayInteractions = interactions?.filter(i => i.date === new Date().toISOString().split('T')[0]).length || 0;

    const qualityBreakdown = interactions?.reduce((acc, i) => {
      acc[i.interaction_quality] = (acc[i.interaction_quality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const dataContext = `User's Stats:
- Current streak: ${userStats?.current_streak || 0} days
- Total interactions (last 30 days): ${totalInteractions}
- Today's interactions: ${todayInteractions}
- Average attractiveness rating: ${avgRating.toFixed(1)}/10
- Quality breakdown: ${qualityBreakdown.good || 0} good, ${qualityBreakdown.neutral || 0} neutral, ${qualityBreakdown.bad || 0} bad
- Most recent interaction: ${interactions && interactions.length > 0 ? new Date(interactions[0].date).toLocaleDateString() : 'None yet'}`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI for chat response...');

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
            content: `You are a friendly, encouraging social confidence coach chatbot. You help users track and improve their social interactions. Be casual, fun, and supportive. Reference their data when relevant. Keep responses concise (2-3 sentences usually). Use encouraging language and celebrate wins.

${dataContext}

When the user asks about their progress, reference the actual numbers. Be specific but conversational.`
          },
          ...messages
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Too many requests right now. Please wait a moment and try again.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI service requires payment. Please contact support.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI chat response received');

    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
