import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header to verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user client to verify the token
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin using service role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin verified:', user.id);

    // Fetch all analytics data using service role
    const [
      profilesResult,
      eldersResult,
      checkInsResult,
      alertsResult,
      medicinesResult
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('elders').select('*'),
      supabaseAdmin.from('check_ins').select('*'),
      supabaseAdmin.from('alerts').select('*'),
      supabaseAdmin.from('medicines').select('*')
    ]);

    const profiles = profilesResult.data || [];
    const elders = eldersResult.data || [];
    const checkIns = checkInsResult.data || [];
    const alerts = alertsResult.data || [];
    const medicines = medicinesResult.data || [];

    // Calculate overview stats
    const totalUsers = profiles.length;
    const totalElders = elders.length;
    const activeTrials = profiles.filter(p => p.subscription_status === 'trial').length;
    const premiumUsers = profiles.filter(p => p.subscription_tier === 'premium').length;
    const proUsers = profiles.filter(p => p.subscription_tier === 'pro').length;
    const basicUsers = profiles.filter(p => p.subscription_tier === 'basic').length;

    // Check-in stats
    const totalCheckIns = checkIns.length;
    const completedCheckIns = checkIns.filter(c => c.status === 'completed').length;
    const voiceCheckIns = checkIns.filter(c => c.check_in_type === 'voice').length;
    const whatsappCheckIns = checkIns.filter(c => c.check_in_type === 'whatsapp').length;
    
    const wellbeingScores = checkIns
      .filter(c => c.well_being_score !== null)
      .map(c => c.well_being_score as number);
    const avgWellbeing = wellbeingScores.length > 0 
      ? wellbeingScores.reduce((a, b) => a + b, 0) / wellbeingScores.length 
      : 0;

    // Alert stats
    const totalAlerts = alerts.length;
    const resolvedAlerts = alerts.filter(a => a.resolved).length;
    const unresolvedAlerts = alerts.filter(a => !a.resolved);

    // Sentiment breakdown
    const sentimentCounts = {
      positive: checkIns.filter(c => c.sentiment === 'positive').length,
      neutral: checkIns.filter(c => c.sentiment === 'neutral').length,
      negative: checkIns.filter(c => c.sentiment === 'negative').length,
    };

    // Language distribution
    const languageCounts: Record<string, number> = {};
    elders.forEach(e => {
      const lang = e.preferred_language || 'english';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    // Check-in method distribution
    const methodCounts: Record<string, number> = {};
    elders.forEach(e => {
      const method = e.check_in_method || 'voice';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    // Daily check-ins for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyCheckIns: Record<string, number> = {};
    checkIns.forEach(c => {
      const date = new Date(c.created_at).toISOString().split('T')[0];
      if (new Date(c.created_at) >= thirtyDaysAgo) {
        dailyCheckIns[date] = (dailyCheckIns[date] || 0) + 1;
      }
    });

    // Daily signups for last 30 days
    const dailySignups: Record<string, number> = {};
    profiles.forEach(p => {
      const date = new Date(p.created_at).toISOString().split('T')[0];
      if (new Date(p.created_at) >= thirtyDaysAgo) {
        dailySignups[date] = (dailySignups[date] || 0) + 1;
      }
    });

    // Recent check-ins
    const recentCheckIns = checkIns
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(c => {
        const elder = elders.find(e => e.id === c.elder_id);
        return {
          id: c.id,
          elderName: elder?.full_name || 'Unknown',
          type: c.check_in_type,
          status: c.status,
          wellbeing: c.well_being_score,
          sentiment: c.sentiment,
          createdAt: c.created_at
        };
      });

    // Alert severity breakdown
    const alertsBySeverity = {
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
    };

    const analytics = {
      overview: {
        totalUsers,
        totalElders,
        activeTrials,
        premiumUsers,
        proUsers,
        basicUsers,
        totalCheckIns,
        totalMedicines: medicines.length,
      },
      checkInStats: {
        total: totalCheckIns,
        completed: completedCheckIns,
        completedRate: totalCheckIns > 0 ? Math.round((completedCheckIns / totalCheckIns) * 100) : 0,
        voiceTotal: voiceCheckIns,
        whatsappTotal: whatsappCheckIns,
        avgWellbeing: Math.round(avgWellbeing * 10) / 10,
      },
      alertStats: {
        total: totalAlerts,
        resolved: resolvedAlerts,
        unresolved: totalAlerts - resolvedAlerts,
        resolutionRate: totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 0,
        bySeverity: alertsBySeverity,
      },
      sentimentBreakdown: sentimentCounts,
      languageDistribution: languageCounts,
      methodDistribution: methodCounts,
      trends: {
        dailyCheckIns: Object.entries(dailyCheckIns)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
        dailySignups: Object.entries(dailySignups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
      },
      recentCheckIns,
      unresolvedAlerts: unresolvedAlerts.map(a => {
        const elder = elders.find(e => e.id === a.elder_id);
        return {
          id: a.id,
          elderName: elder?.full_name || 'Unknown',
          title: a.title,
          severity: a.severity,
          createdAt: a.created_at,
        };
      }),
      users: profiles.map(p => ({
        id: p.id,
        fullName: p.full_name,
        subscriptionTier: p.subscription_tier,
        subscriptionStatus: p.subscription_status,
        createdAt: p.created_at,
        elderCount: elders.filter(e => e.family_member_id === p.id).length,
      })),
    };

    console.log('Analytics computed successfully');

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
