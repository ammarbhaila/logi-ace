// require('dotenv').config({ path: '.env.local' });
// const { createClient } = require('@supabase/supabase-js');

// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// async function testFetch() {
//     // We need the ID of the newly signed up admin. 
//     // Let's just fetch ANY profile where userrole='Admin'
//     const { data: profiles, error } = await supabase
//         .from('profile')
//         .select('id, userId, userrole, email')
//         .eq('userrole', 'Admin');

//     console.log("Admins:", profiles);

//     if (profiles && profiles.length > 0) {
//         for (const p of profiles) {
//             console.log(`Testing query for ${p.email} (id: ${p.id}, userId: ${p.userId})`);
//             const targetId = p.userId || p.id;
            
//             const { data: fetched, error: fetchErr } = await supabase
//                 .from('profile')
//                 .select('userrole')
//                 .or(`id.eq.${targetId},userId.eq.${targetId}`)
//                 .single();
                
//             console.log("  Fetch result:", { fetched, error: fetchErr });
//         }
//     }
// }

// testFetch();
