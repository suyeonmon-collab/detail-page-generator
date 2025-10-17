import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 [API] Supabase 권한 정책 수정 시작');

    // RLS 정책 설정
    const policies = [
      // categories 테이블 정책
      {
        table: 'categories',
        policy: 'Enable read access for all users',
        command: 'SELECT',
        roles: ['public'],
        using: 'true'
      },
      {
        table: 'categories',
        policy: 'Enable insert for authenticated users only',
        command: 'INSERT',
        roles: ['authenticated'],
        with_check: 'true'
      },
      {
        table: 'categories',
        policy: 'Enable update for authenticated users only',
        command: 'UPDATE',
        roles: ['authenticated'],
        using: 'true',
        with_check: 'true'
      },
      {
        table: 'categories',
        policy: 'Enable delete for authenticated users only',
        command: 'DELETE',
        roles: ['authenticated'],
        using: 'true'
      },

      // templates 테이블 정책
      {
        table: 'templates',
        policy: 'Enable read access for all users',
        command: 'SELECT',
        roles: ['public'],
        using: 'true'
      },
      {
        table: 'templates',
        policy: 'Enable insert for authenticated users only',
        command: 'INSERT',
        roles: ['authenticated'],
        with_check: 'true'
      },
      {
        table: 'templates',
        policy: 'Enable update for authenticated users only',
        command: 'UPDATE',
        roles: ['authenticated'],
        using: 'true',
        with_check: 'true'
      },
      {
        table: 'templates',
        policy: 'Enable delete for authenticated users only',
        command: 'DELETE',
        roles: ['authenticated'],
        using: 'true'
      }
    ];

    // 기존 정책 삭제
    for (const policy of policies) {
      try {
        await supabase.rpc('drop_policy_if_exists', {
          table_name: policy.table,
          policy_name: policy.policy
        });
      } catch (error) {
        console.log(`⚠️ [API] 정책 삭제 실패 (무시 가능): ${policy.table}.${policy.policy}`);
      }
    }

    // 새 정책 생성
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('create_policy', {
          table_name: policy.table,
          policy_name: policy.policy,
          command: policy.command,
          roles: policy.roles,
          using: policy.using,
          with_check: policy.with_check
        });

        if (error) {
          console.error(`❌ [API] 정책 생성 실패: ${policy.table}.${policy.policy}`, error);
        } else {
          console.log(`✅ [API] 정책 생성 성공: ${policy.table}.${policy.policy}`);
        }
      } catch (error) {
        console.error(`❌ [API] 정책 생성 오류: ${policy.table}.${policy.policy}`, error);
      }
    }

    // RLS 활성화
    const tables = ['categories', 'templates'];
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('enable_rls', {
          table_name: table
        });

        if (error) {
          console.error(`❌ [API] RLS 활성화 실패: ${table}`, error);
        } else {
          console.log(`✅ [API] RLS 활성화 성공: ${table}`);
        }
      } catch (error) {
        console.error(`❌ [API] RLS 활성화 오류: ${table}`, error);
      }
    }

    console.log('✅ [API] Supabase 권한 정책 수정 완료');

    res.status(200).json({
      success: true,
      message: 'Supabase 권한 정책이 성공적으로 수정되었습니다.',
      policies: policies.length,
      tables: tables.length
    });

  } catch (error) {
    console.error('❌ [API] Supabase 권한 정책 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Supabase 권한 정책 수정 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}
