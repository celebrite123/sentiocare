import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${monday.toISOString().split('T')[0]}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin verified:', user.id);

    // Fetch all data including call_attempts and notification_settings
    const [
      profilesResult,
      eldersResult,
      checkInsResult,
      alertsResult,
      medicinesResult,
      organizationsResult,
      orgMembersResult,
      dischargedPatientsResult,
      b2bAlertsResult,
      b2bLeadsResult,
      callAttemptsResult,
      notificationSettingsResult
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('elders').select('*'),
      supabaseAdmin.from('check_ins').select('*'),
      supabaseAdmin.from('alerts').select('*'),
      supabaseAdmin.from('medicines').select('*'),
      supabaseAdmin.from('organizations').select('*'),
      supabaseAdmin.from('organization_members').select('*'),
      supabaseAdmin.from('discharged_patients').select('id, organization_id'),
      supabaseAdmin.from('b2b_alerts').select('id, organization_id, resolved'),
      supabaseAdmin.from('b2b_leads').select('*').order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('call_attempts').select('*'),
      supabaseAdmin.from('notification_settings').select('*')
    ]);

    const profiles = profilesResult.data || [];
    const elders = eldersResult.data || [];
    const checkIns = checkInsResult.data || [];
    const alerts = alertsResult.data || [];
    const medicines = medicinesResult.data || [];
    const organizations = organizationsResult.data || [];
    const orgMembers = orgMembersResult.data || [];
    const dischargedPatients = dischargedPatientsResult.data || [];
    const b2bAlerts = b2bAlertsResult.data || [];
    const b2bLeads = b2bLeadsResult.data || [];
    const callAttempts = callAttemptsResult.data || [];
    const notificationSettings = notificationSettingsResult.data || [];

    // ===== EXISTING ANALYTICS =====
    const totalUsers = profiles.length;
    const totalElders = elders.length;
    const activeTrials = profiles.filter(p => p.subscription_status === 'trial').length;
    const premiumUsers = profiles.filter(p => p.subscription_tier === 'premium').length;
    const proUsers = profiles.filter(p => p.subscription_tier === 'pro').length;
    const basicUsers = profiles.filter(p => p.subscription_tier === 'basic').length;

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

    const totalAlerts = alerts.length;
    const resolvedAlerts = alerts.filter(a => a.resolved).length;
    const unresolvedAlerts = alerts.filter(a => !a.resolved);

    const sentimentCounts = {
      positive: checkIns.filter(c => c.sentiment === 'positive').length,
      neutral: checkIns.filter(c => c.sentiment === 'neutral').length,
      negative: checkIns.filter(c => c.sentiment === 'negative').length,
    };

    const languageCounts: Record<string, number> = {};
    elders.forEach(e => {
      const lang = e.preferred_language || 'english';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    const methodCounts: Record<string, number> = {};
    elders.forEach(e => {
      const method = e.check_in_method || 'voice';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyCheckIns: Record<string, number> = {};
    checkIns.forEach(c => {
      const date = new Date(c.created_at).toISOString().split('T')[0];
      if (new Date(c.created_at) >= thirtyDaysAgo) {
        dailyCheckIns[date] = (dailyCheckIns[date] || 0) + 1;
      }
    });

    const dailySignups: Record<string, number> = {};
    profiles.forEach(p => {
      const date = new Date(p.created_at).toISOString().split('T')[0];
      if (new Date(p.created_at) >= thirtyDaysAgo) {
        dailySignups[date] = (dailySignups[date] || 0) + 1;
      }
    });

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

    const alertsBySeverity = {
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
    };

    // ===== PILOT METRICS =====

    // 1. Weekly Pickup Rates from call_attempts
    const weeklyPickupMap: Record<string, { total: number; answered: number }> = {};
    callAttempts.forEach(ca => {
      const week = getWeekLabel(ca.initiated_at || ca.created_at);
      if (!weeklyPickupMap[week]) weeklyPickupMap[week] = { total: 0, answered: 0 };
      weeklyPickupMap[week].total++;
      if (ca.status === 'completed' || ca.status === 'answered') {
        weeklyPickupMap[week].answered++;
      }
    });
    const weeklyPickupRates = Object.entries(weeklyPickupMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        totalAttempts: data.total,
        answered: data.answered,
        pickupRate: data.total > 0 ? Math.round((data.answered / data.total) * 1000) / 10 : 0
      }));

    // 2. Medication Verification from completed check-ins
    const completedCheckins = checkIns.filter(c => c.status === 'completed');
    const medsVerified = completedCheckins.filter(c => c.medicines_taken !== null);
    const medsTaken = completedCheckins.filter(c => c.medicines_taken === true);
    const medsMissed = completedCheckins.filter(c => c.medicines_taken === false);
    const medsUnknown = completedCheckins.filter(c => c.medicines_taken === null);

    const medicationVerification = {
      total: completedCheckins.length,
      verified: medsVerified.length,
      tookMeds: medsTaken.length,
      missedMeds: medsMissed.length,
      unknown: medsUnknown.length,
      verificationRate: completedCheckins.length > 0 ? Math.round((medsVerified.length / completedCheckins.length) * 1000) / 10 : 0,
      adherenceRate: medsVerified.length > 0 ? Math.round((medsTaken.length / medsVerified.length) * 1000) / 10 : 0
    };

    // 3. Escalation Accuracy
    const resolvedAlertsList = alerts.filter(a => a.resolved);
    const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
    const highSeverityResolved = highSeverityAlerts.filter(a => a.resolved);
    // "Resolved quickly" proxy: alerts where created_at and the fact they're resolved suggests quick action
    // Since alerts table doesn't have updated_at, we count resolved high-severity as real emergencies caught
    const escalationAccuracy = {
      total: totalAlerts,
      resolved: resolvedAlerts,
      pending: totalAlerts - resolvedAlerts,
      highSeverity: highSeverityAlerts.length,
      highSeverityResolved: highSeverityResolved.length,
      mediumSeverity: alertsBySeverity.medium,
      lowSeverity: alertsBySeverity.low,
      resolutionRate: totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 1000) / 10 : 0
    };

    // 4. Family Engagement from notification_settings
    const totalFamilies = notificationSettings.length;
    const alertsEnabled = notificationSettings.filter(ns => ns.notify_on_alert).length;
    const weeklySummaryEnabled = notificationSettings.filter(ns => ns.weekly_summary_enabled).length;
    const missedCheckinEnabled = notificationSettings.filter(ns => ns.notify_on_missed_checkin).length;
    const smsEnabled = notificationSettings.filter(ns => ns.notify_sms).length;
    const emailEnabled = notificationSettings.filter(ns => ns.notify_email).length;

    const familyEngagement = {
      totalFamilies,
      alertsEnabled,
      weeklySummaryEnabled,
      missedCheckinEnabled,
      smsEnabled,
      emailEnabled,
      engagementRate: totalFamilies > 0 ? Math.round((alertsEnabled / totalFamilies) * 1000) / 10 : 0
    };

    // 5. Elder-level Breakdown
    const elderBreakdown = elders.map(elder => {
      const elderCalls = callAttempts.filter(ca => ca.elder_id === elder.id);
      const elderAnswered = elderCalls.filter(ca => ca.status === 'completed' || ca.status === 'answered');
      const elderCheckIns = checkIns.filter(c => c.elder_id === elder.id && c.status === 'completed');
      const elderWellbeing = elderCheckIns
        .filter(c => c.well_being_score !== null)
        .map(c => c.well_being_score as number);
      const elderMedsTaken = elderCheckIns.filter(c => c.medicines_taken === true).length;
      const elderMedsVerified = elderCheckIns.filter(c => c.medicines_taken !== null).length;
      const elderAlerts = alerts.filter(a => a.elder_id === elder.id);

      return {
        name: elder.full_name,
        callsAttempted: elderCalls.length,
        callsAnswered: elderAnswered.length,
        pickupRate: elderCalls.length > 0 ? Math.round((elderAnswered.length / elderCalls.length) * 1000) / 10 : 0,
        avgWellbeing: elderWellbeing.length > 0 ? Math.round((elderWellbeing.reduce((a, b) => a + b, 0) / elderWellbeing.length) * 10) / 10 : 0,
        totalCheckIns: elderCheckIns.length,
        medsTakenRate: elderMedsVerified > 0 ? Math.round((elderMedsTaken / elderMedsVerified) * 1000) / 10 : 0,
        alertsTriggered: elderAlerts.length,
        alertsResolved: elderAlerts.filter(a => a.resolved).length
      };
    });

    // 6. Weekly Wellbeing Trend
    const weeklyWellbeingMap: Record<string, { total: number; sum: number }> = {};
    checkIns.forEach(c => {
      if (c.well_being_score !== null && c.status === 'completed') {
        const week = getWeekLabel(c.created_at);
        if (!weeklyWellbeingMap[week]) weeklyWellbeingMap[week] = { total: 0, sum: 0 };
        weeklyWellbeingMap[week].total++;
        weeklyWellbeingMap[week].sum += c.well_being_score as number;
      }
    });
    const weeklyWellbeing = Object.entries(weeklyWellbeingMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        avgScore: Math.round((data.sum / data.total) * 10) / 10,
        count: data.total
      }));

    const pilotMetrics = {
      weeklyPickupRates,
      medicationVerification,
      escalationAccuracy,
      familyEngagement,
      elderBreakdown,
      weeklyWellbeing
    };

    // ===== BUILD RESPONSE =====
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
      b2b: {
        organizations: organizations.map(org => ({
          id: org.id,
          name: org.name,
          type: org.type || 'hospital',
          status: 'active',
          contact_email: org.contact_email,
          contact_phone: org.contact_phone,
          monthly_patient_limit: org.monthly_patient_limit,
          monthly_sms_limit: org.monthly_sms_limit,
          monthly_call_limit: org.monthly_call_limit,
          calls_used_this_month: org.calls_used_this_month || 0,
          sms_used_this_month: org.sms_used_this_month || 0,
          patients_this_month: org.patients_this_month || 0,
          auto_48hr_check: org.auto_48hr_check,
          auto_medicine_reminders: org.auto_medicine_reminders,
          hospital_contact_number: org.hospital_contact_number,
          escalation_phone: org.escalation_phone,
          escalation_email: org.escalation_email,
          bolna_agent_id: org.bolna_agent_id,
          bolna_agent_id_hindi: org.bolna_agent_id_hindi,
          voice_enabled: org.voice_enabled,
          default_language: org.default_language,
          createdAt: org.created_at,
          patientsCount: dischargedPatients.filter(p => p.organization_id === org.id).length,
          staffCount: orgMembers.filter(m => m.organization_id === org.id).length,
        })),
        leads: b2bLeads.map(lead => ({
          id: lead.id,
          organization_name: lead.organization_name,
          contact_name: lead.contact_name,
          contact_email: lead.contact_email,
          contact_phone: lead.contact_phone,
          status: lead.status,
          created_at: lead.created_at,
        })),
        stats: {
          totalOrganizations: organizations.length,
          activeOrganizations: organizations.length,
          totalPatients: dischargedPatients.length,
          totalStaff: orgMembers.length,
          totalAlerts: b2bAlerts.length,
          unresolvedAlerts: b2bAlerts.filter(a => !a.resolved).length,
          callsThisMonth: organizations.reduce((sum, org) => sum + (org.calls_used_this_month || 0), 0),
          smsThisMonth: organizations.reduce((sum, org) => sum + (org.sms_used_this_month || 0), 0),
          leads: {
            total: b2bLeads.length,
            new: b2bLeads.filter(l => l.status === 'new').length,
            contacted: b2bLeads.filter(l => l.status === 'contacted').length,
            qualified: b2bLeads.filter(l => l.status === 'qualified').length,
            converted: b2bLeads.filter(l => l.status === 'converted').length,
          }
        }
      },
      pilotMetrics
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
