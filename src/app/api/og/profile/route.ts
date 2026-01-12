import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Helper to fetch profile data and top KPI
async function getProfileOGData(username: string) {
  // Fetch profile
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, branch, year, section")
    .eq("username", username)
    .eq("is_public", true)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Fetch all KPIs for this profile's quests
  const { data: quests } = await supabaseServer
    .from("quests")
    .select("id")
    .eq("profile_id", profile.id);

  const questIds = (quests || []).map((q) => q.id);

  let topKPI = null;
  if (questIds.length > 0) {
    const { data: kpis } = await supabaseServer
      .from("kpis")
      .select("name, value, target")
      .in("quest_id", questIds)
      .order("updated_at", { ascending: false });

    if (kpis && kpis.length > 0) {
      // Find KPI with highest progress percentage
      topKPI = kpis
        .map((kpi) => {
          const value = parseFloat(String(kpi.value)) || 0;
          const target = parseFloat(String(kpi.target)) || 0;
          const percent = target > 0 ? (value / target) * 100 : 0;
          return {
            name: kpi.name,
            value,
            target,
            percent: Math.min(100, Math.max(0, percent)),
          };
        })
        .sort((a, b) => b.percent - a.percent)[0];
    }
  }

  return {
    profile,
    topKPI,
  };
}

// Helper to generate SVG content
function generateOGSVG(
  displayName: string,
  username: string,
  avatarUrl: string | null,
  topKPI: { name: string; percent: number } | null,
  branch: string | null,
  year: number | null
): string {
  const initials = (displayName || username)[0].toUpperCase();
  const hasAvatar = avatarUrl && avatarUrl.trim() !== "";

  // Truncate long names
  const truncatedName =
    displayName.length > 30 ? displayName.substring(0, 27) + "..." : displayName;
  const truncatedUsername =
    username.length > 25 ? username.substring(0, 22) + "..." : username;

  // Format KPI text
  const kpiText = topKPI
    ? `${topKPI.name}: ${Math.round(topKPI.percent)}%`
    : "No KPIs yet";

  // Branch and year info
  const branchYear = [branch, year ? `Year ${year}` : null]
    .filter(Boolean)
    .join(" • ");

  // Escape XML special characters
  const escapeXml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
    </linearGradient>
    ${hasAvatar
      ? `<clipPath id="avatarClip">
         <circle cx="60" cy="60" r="60"/>
       </clipPath>`
      : ""}
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  
  <!-- Decorative circles -->
  <circle cx="1000" cy="100" r="150" fill="#262626" opacity="0.3"/>
  <circle cx="1100" cy="500" r="120" fill="#262626" opacity="0.2"/>
  <circle cx="50" cy="550" r="80" fill="#262626" opacity="0.25"/>
  
  <!-- Content container -->
  <g transform="translate(100, 100)">
    <!-- Avatar or Initials -->
    ${hasAvatar
      ? `<image href="${escapeXml(avatarUrl)}" x="0" y="0" width="120" height="120" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>
       <circle cx="60" cy="60" r="60" fill="none" stroke="#262626" stroke-width="2"/>`
      : `<circle cx="60" cy="60" r="60" fill="#737373"/>
       <text x="60" y="85" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="48" font-weight="600" fill="#f5f5f5" text-anchor="middle">${escapeXml(initials)}</text>`}
    
    <!-- Name -->
    <text x="0" y="180" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="700" fill="#f5f5f5">
      ${escapeXml(truncatedName)}
    </text>
    
    <!-- Username -->
    <text x="0" y="225" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="400" fill="#a3a3a3">
      @${escapeXml(truncatedUsername)}
    </text>
    
    <!-- Branch/Year -->
    ${branchYear
      ? `<text x="0" y="275" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="400" fill="#737373">
        ${escapeXml(branchYear)}
      </text>`
      : ""}
    
    <!-- Top KPI Section -->
    <g transform="translate(0, 340)">
      <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="600" fill="#a3a3a3" letter-spacing="2px">
        TOP KPI
      </text>
      
      <!-- KPI Name -->
      <text x="0" y="50" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="600" fill="#f5f5f5">
        ${escapeXml(topKPI ? topKPI.name : "N/A")}
      </text>
      
      <!-- Progress Bar Container -->
      <g transform="translate(0, 80)">
        <!-- Progress Bar Background -->
        <rect x="0" y="0" width="500" height="24" rx="12" fill="#262626"/>
        
        ${topKPI
          ? (() => {
              const progressWidth = Math.min(500, Math.max(24, (topKPI.percent / 100) * 500));
              const textX = topKPI.percent > 50 
                ? Math.min(530, progressWidth + 30) 
                : 250;
              const textColor = topKPI.percent > 50 ? "#0a0a0a" : "#f5f5f5";
              const textAnchor = topKPI.percent > 50 ? "start" : "middle";
              return `<!-- Progress Bar Fill -->
         <rect x="0" y="0" width="${progressWidth}" height="24" rx="12" fill="#f5f5f5"/>
         <!-- Percentage Text -->
         <text x="${textX}" y="17" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="${textColor}" text-anchor="${textAnchor}">
           ${Math.round(topKPI.percent)}%
         </text>`;
            })()
          : `<text x="250" y="17" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="400" fill="#737373" text-anchor="middle">
          No active KPIs
        </text>`}
      </g>
    </g>
    
    <!-- QuestBoard branding -->
    <g transform="translate(850, 450)">
      <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="700" fill="#f5f5f5" opacity="0.8">
        QuestBoard
      </text>
      <text x="0" y="30" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="#737373" opacity="0.6">
        Progress &amp; Stories
      </text>
    </g>
  </g>
</svg>`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return new NextResponse("Username is required", { status: 400 });
    }

    // Fetch profile data
    const data = await getProfileOGData(username.trim());

    if (!data) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    const { profile, topKPI } = data;
    const displayName = profile.display_name || profile.username;

    // Generate SVG
    const svg = generateOGSVG(
      displayName,
      profile.username,
      profile.avatar_url,
      topKPI,
      profile.branch,
      profile.year
    );

    // Return SVG with proper headers
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("OG image generation error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
