// Hand-written, schema-aligned type definitions used by the Supabase
// JS client. The shape mirrors what `supabase gen types typescript`
// produces (`__InternalSupabase` marker, `Relationships: []` on each
// table) so that recent versions of `@supabase/postgrest-js` accept
// inserts and updates correctly.

export type AppRole = 'admin' | 'manager' | 'qa_engineer' | 'developer' | 'viewer';
export type ProjectRole = 'owner' | 'manager' | 'qa_engineer' | 'developer' | 'viewer';
export type TestPriority = 'low' | 'medium' | 'high' | 'critical';
export type CaseStatus = 'draft' | 'active' | 'deprecated';
export type RunStatus = 'not_started' | 'in_progress' | 'completed' | 'aborted';
export type ResultStatus = 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';
export type BugSeverity = 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
export type BugPriority = 'low' | 'medium' | 'high' | 'urgent';
export type BugStatus =
  | 'new'
  | 'triaged'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'reopened'
  | 'closed'
  | 'wont_fix';

export type TestStep = {
  step: string;
  expected: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
};

export type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_by: string;
  archived: boolean;
  created_at: string;
};

export type ProjectMember = {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
};

export type TestSuite = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type TestCaseSource = {
  type: 'ai';
  provider: string;
  model: string;
  repo?: string;
  ref?: string | null;
  files?: string[];
  generated_at?: string;
} | Record<string, unknown>;

export type TestCase = {
  id: string;
  project_id: string;
  suite_id: string | null;
  title: string;
  preconditions: string | null;
  steps: TestStep[];
  expected_result: string | null;
  priority: TestPriority;
  status: CaseStatus;
  tags: string[];
  source: TestCaseSource | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TestPlan = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type TestRun = {
  id: string;
  project_id: string;
  plan_id: string | null;
  name: string;
  description: string | null;
  status: RunStatus;
  environment: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
};

export type TestRunResult = {
  id: string;
  run_id: string;
  case_id: string;
  status: ResultStatus;
  notes: string | null;
  duration_ms: number | null;
  assigned_to: string | null;
  executed_by: string | null;
  executed_at: string | null;
  created_at: string;
};

export type Bug = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  expected_result: string | null;
  actual_result: string | null;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  environment: string | null;
  reporter_id: string;
  assignee_id: string | null;
  run_result_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BugComment = {
  id: string;
  bug_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  project_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Auto-generated columns (defaults / triggers) that are optional on insert.
type InsertProfile = Optional<Profile, 'avatar_url' | 'role' | 'created_at'>;
type InsertProject = Optional<Project, 'id' | 'description' | 'archived' | 'created_at'>;
type InsertMember = Optional<ProjectMember, 'role' | 'joined_at'>;
type InsertSuite = Optional<TestSuite, 'id' | 'description' | 'created_at'>;
type InsertCase = Optional<
  TestCase,
  | 'id'
  | 'suite_id'
  | 'preconditions'
  | 'expected_result'
  | 'priority'
  | 'status'
  | 'tags'
  | 'steps'
  | 'source'
  | 'created_at'
  | 'updated_at'
>;
type InsertPlan = Optional<TestPlan, 'id' | 'description' | 'created_at'>;
type InsertPlanCase = { plan_id: string; case_id: string; position?: number };
type InsertRun = Optional<
  TestRun,
  | 'id'
  | 'plan_id'
  | 'description'
  | 'status'
  | 'environment'
  | 'started_at'
  | 'completed_at'
  | 'created_at'
>;
type InsertResult = Optional<
  TestRunResult,
  | 'id'
  | 'status'
  | 'notes'
  | 'duration_ms'
  | 'assigned_to'
  | 'executed_by'
  | 'executed_at'
  | 'created_at'
>;
type InsertBug = Optional<
  Bug,
  | 'id'
  | 'description'
  | 'steps_to_reproduce'
  | 'expected_result'
  | 'actual_result'
  | 'severity'
  | 'priority'
  | 'status'
  | 'environment'
  | 'assignee_id'
  | 'run_result_id'
  | 'closed_at'
  | 'created_at'
  | 'updated_at'
>;
type InsertBugComment = Optional<BugComment, 'id' | 'created_at'>;
type InsertActivity = Optional<ActivityLog, 'id' | 'entity_id' | 'metadata' | 'created_at'>;

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: InsertProfile;
        Update: Partial<Profile>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: InsertProject;
        Update: Partial<Project>;
        Relationships: [];
      };
      project_members: {
        Row: ProjectMember;
        Insert: InsertMember;
        Update: Partial<ProjectMember>;
        Relationships: [];
      };
      test_suites: {
        Row: TestSuite;
        Insert: InsertSuite;
        Update: Partial<TestSuite>;
        Relationships: [];
      };
      test_cases: {
        Row: TestCase;
        Insert: InsertCase;
        Update: Partial<TestCase>;
        Relationships: [];
      };
      test_plans: {
        Row: TestPlan;
        Insert: InsertPlan;
        Update: Partial<TestPlan>;
        Relationships: [];
      };
      test_plan_cases: {
        Row: { plan_id: string; case_id: string; position: number };
        Insert: InsertPlanCase;
        Update: { position?: number };
        Relationships: [];
      };
      test_runs: {
        Row: TestRun;
        Insert: InsertRun;
        Update: Partial<TestRun>;
        Relationships: [];
      };
      test_run_results: {
        Row: TestRunResult;
        Insert: InsertResult;
        Update: Partial<TestRunResult>;
        Relationships: [];
      };
      bugs: {
        Row: Bug;
        Insert: InsertBug;
        Update: Partial<Bug>;
        Relationships: [];
      };
      bug_comments: {
        Row: BugComment;
        Insert: InsertBugComment;
        Update: Partial<BugComment>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLog;
        Insert: InsertActivity;
        Update: Partial<ActivityLog>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_project: {
        Args: { p_name: string; p_key: string; p_description: string | null };
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      project_role: ProjectRole;
      test_priority: TestPriority;
      case_status: CaseStatus;
      run_status: RunStatus;
      result_status: ResultStatus;
      bug_severity: BugSeverity;
      bug_priority: BugPriority;
      bug_status: BugStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
