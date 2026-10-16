// cspell:ignore getfacl
// @story #190
// Installed filesystem/protocol evidence only; declared sessions are not provider proof.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { packRuntime } from '../helpers/runtime-package.mjs';
import { runNpm } from '../helpers/npm-command.mjs';

test(
  'installed local handoff preserves ordinary and linked projects without ACL challenges',
  { timeout: 800000 },
  async (t) => {
    const testDeadline = Date.now() + 800000;
    const parent = mkdtempSync(path.join(tmpdir(), 'apr-local-handoff-'));
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    const root = path.join(parent, 'project');
    const home = path.join(parent, 'account');
    mkdirSync(root);
    mkdirSync(home);
    mkdirSync(path.join(home, '.config', 'ai-peer-review'), { recursive: true });
    mkdirSync(path.join(home, 'AppData', 'Local', 'ai-peer-review'), { recursive: true });
    const git = (...args) =>
      execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '-b', 'trunk');
    git('config', 'user.name', 'Local handoff fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    writeFileSync(path.join(root, 'artifact.md'), '# Review me\n');
    writeFileSync(path.join(root, 'plan.md'), '# Plan\n');
    git('add', '.');
    git('commit', '-m', 'fixture');
    const linked = path.join(parent, 'linked project');
    git('worktree', 'add', '-b', 'review-linked', linked);
    const { tarball } = packRuntime(t);
    const prefix = path.join(parent, 'installed');
    runNpm(
      'npm',
      [
        'install',
        '--global',
        '--prefix',
        prefix,
        '--ignore-scripts',
        '--offline',
        '--no-audit',
        '--no-fund',
        tarball,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const installed = path.join(
      prefix,
      ...(process.platform === 'win32' ? [] : ['lib']),
      'node_modules',
      '@kburson',
      'ai-peer-review'
    );
    // Explicit installed invocations must not depend on a different global tool locator.
    const unrelatedSelection = {
      schema: 'ai-peer-review.runtime-selection/v1',
      selection_id: '00000000-0000-4000-8000-000000000001',
      package_root: root,
      node_executable: process.execPath,
      package_name: '@kburson/ai-peer-review',
      registered_at: '2026-10-16T00:00:00.000Z',
    };
    const selectionFile = path.join(
      home,
      process.platform === 'win32' ? 'AppData/Local' : '.config',
      'ai-peer-review',
      'runtime-selection.json'
    );
    writeFileSync(selectionFile, JSON.stringify(unrelatedSelection));
    const module = (name) => JSON.stringify(pathToFileURL(path.join(installed, name)).href);
    const script = String.raw`
    import childProcess from 'node:child_process';
    import {syncBuiltinESMExports} from 'node:module';
    const securityProcesses=[]; const gitInventories=[]; const sourceClassReads=[]; let inOperation=false; let gitCalls=0;
    for(const name of ['execFile','execFileSync','spawn','spawnSync']) {
      const original=childProcess[name];
      childProcess[name]=function(...args) {
        if(args[0]==='git') gitCalls++;
        if(/(?:powershell|pwsh|icacls|getfacl|broker.security)/i.test(JSON.stringify(args.slice(0,2)))) securityProcesses.push(name);
        if(inOperation && args[0]==='git' && (/(?:status|for-each-ref|--others)/.test(JSON.stringify(args[1])) || (args[1]?.includes('--stage') && !args[1].includes('--')))) gitInventories.push(args[1]);
        return Reflect.apply(original,this,args);
      };
    }
    const nativeFs=await import('node:fs'); const fsDefault=nativeFs.default;
    const read=fsDefault.readFileSync;
    fsDefault.readFileSync=function(file,...args) {
      if(/process-source-contract(?:s|files)\.json/.test(String(file))) sourceClassReads.push(String(file));
      return Reflect.apply(read,this,[file,...args]);
    };
    syncBuiltinESMExports();
    const {startReview,joinReview,submitReviewTurn,submitAuthorTurn,finalizeReview,advanceReview}=await import(${module('src/cli/run.mjs')});
    const {withReviewLock,atomicWrite,atomicCreate}=await import(${module('src/protocol/store.mjs')});
    const {withOperationAuthority}=await import(${module('src/startup/authority-fence.mjs')});
    const {initializeReview}=await import(${module('src/protocol/service.mjs')});
    const {participantIdentity}=await import(${module('src/identity/registry.mjs')});
    const fs=await import('node:fs'); const path=await import('node:path');
    const operationModule=${module('src/cli/run.mjs')};
    const profile=${JSON.stringify(new URL('../helpers/installed-provider/account-profile.mjs', import.meta.url).href)};
    function fresh(code) {
      return childProcess.spawnSync(process.execPath,['--import',profile,'--input-type=module','-e',code],{cwd:process.cwd(),encoding:'utf8',env:process.env,timeout:30000});
    }

    const git=(...args)=>childProcess.execFileSync('git',args,{cwd:process.cwd(),encoding:'utf8'});
    const gitState=()=>JSON.stringify({head:git('rev-parse','HEAD'),index:fs.readFileSync(git('rev-parse','--git-path','index').trim()).toString('hex'),refs:git('for-each-ref','--format=%(refname) %(objectname)')});
    let operations=0;
    async function operation(callback) {
      const before=gitState(); inOperation=true;
      try {return await callback();} finally {inOperation=false; if(gitState()!==before) throw Error('automation changed Git state'); operations++;}
    }
    const section=(file,heading,value)=>{
      const text=fs.readFileSync(file,'utf8');
      const prefix='## '+heading+'\\n\\n';
      const expression=new RegExp('('+prefix+')[\\s\\S]*?(?=\\n\\n## |$)');
      fs.writeFileSync(file,text.replace(expression,'$1'+value));
    };
    try {
      const initialArtifactBytes=fs.readFileSync('artifact.md');
      const expectedPlanDigest='sha256:'+(await import('node:crypto')).createHash('sha256').update(fs.readFileSync('plan.md')).digest('hex');
      const author=participantIdentity({role:'author',host:'codex',provider:'openai',modelId:'declared-model',modelDisplay:'Declared fixture',sessionId:'fixture-author',source:'declared',joinedAt:new Date().toISOString()});
      const result=await operation(()=>startReview({cwd:process.cwd(),artifact:'artifact.md',artifactKind:'spec',phases:'spec,plan',issue:190,reviewerProvider:'codex',reviewerModel:'declared-model',reviewerEffort:'medium',transportMode:'automatic-required',identity:author}));
      const redirects=[];
      for(const directory of ['locks','deliveries','provider']) {
        const bound=path.join(result.paths.workspace,directory), saved=bound+'-original';
        const outside=fs.mkdtempSync(path.join(path.dirname(process.cwd()),'outside-coordination-'));
        const present=fs.existsSync(bound); if(present) fs.renameSync(bound,saved);
        fs.symlinkSync(outside,bound,process.platform==='win32'?'junction':'dir');
        let code=null;
        try {await withOperationAuthority({operation:'submit',cwd:process.cwd(),reviewWorkspace:result.paths.workspace},()=>directory==='locks'?withReviewLock(result.paths.workspace,()=>{}):directory==='deliveries'?atomicCreate(path.join(bound,'probe.json'),'outside'):atomicWrite(path.join(bound,'claude','probe.json'),'outside'));} catch(error){code=error.code;}
        redirects.push({directory,code,outsideWrites:fs.readdirSync(outside).length});
        fs.unlinkSync(bound); if(present) fs.renameSync(saved,bound);
      }
      if(redirects.some(x=>x.code!=='APR_PATH_OUTSIDE_REPOSITORY'||x.outsideWrites!==0)) throw Error('coordination path redirect: '+JSON.stringify(redirects));
      let expiredRecovery=null; const beforeExpired=gitCalls;
      try {await withOperationAuthority({operation:'submit',cwd:process.cwd(),reviewWorkspace:result.paths.workspace,deadline:performance.now()-1},()=>{});} catch(error) {expiredRecovery=error.recovery;}
      if(gitCalls!==beforeExpired) throw Error('expired operation ran Git before checking its original budget');
      if(typeof expiredRecovery!=='string'||!expiredRecovery.includes('reconcile-launch')||/activated primary|selected runtime/.test(expiredRecovery)) throw Error('local timeout suggests enrollment: '+expiredRecovery);
      const initialSnapshot=path.join(result.paths.workspace,'artifacts','start.md');
      const initialSnapshotDurable=fs.existsSync(initialSnapshot) && fs.readFileSync(initialSnapshot).equals(initialArtifactBytes);
      const legacyWorkspace=path.join(process.cwd(),'.scratch','peer-review','legacy-attempt');
      const initialEvent=JSON.parse(fs.readFileSync(result.paths.events,'utf8').split('\n')[0]);
      initialEvent.payload.commit_mode='normal';
      let legacyCode=null;
      try { await initializeReview(legacyWorkspace,initialEvent); } catch(error) {legacyCode=error.code;}
      const legacyRefusedWithoutWrite=legacyCode==='APR_LEGACY_REVIEW_READ_ONLY' && !fs.existsSync(path.join(legacyWorkspace,'events.jsonl'));
      const reviewer=participantIdentity({role:'reviewer',host:'codex',provider:'openai',modelId:'declared-model',modelDisplay:'Declared fixture',sessionId:'fixture-reviewer',source:'declared',joinedAt:new Date().toISOString()});
      const joined=await operation(()=>joinReview({cwd:process.cwd(),invitation:result.paths.reviewer_invitation,identity:reviewer}));
      // Human activity between turns is allowed; only automation operations are compared.
      fs.writeFileSync('unrelated.txt','human work'); git('add','unrelated.txt'); git('commit','-m','human unrelated work');
      fs.writeFileSync('untracked.txt','human untracked work');
      for(const [heading,value] of [['Summary','One revision.'],['Findings','### R1-F001 — Repair\\n\\nRepair the artifact.'],['Required changes','Address R1-F001.'],['Optional suggestions','None.'],['Decision','revisions-requested']]) section(joined.paths.response,heading,value.replaceAll('\\n','\n'));
      const authorTurn=await operation(()=>submitReviewTurn({cwd:process.cwd(),workspace:result.paths.workspace,identity:reviewer,decision:'revisions-requested'}));
      fs.writeFileSync('artifact.md','# Revised artifact\n');
      for(const [heading,value] of [['Summary','Repaired.'],['Finding dispositions','R1-F001 — fixed'],['Changes made','Revised artifact.'],['Declined changes and rationale','None.'],['Verification','Installed protocol fixture only.']]) section(authorTurn.paths.response,heading,value);
      const authorInput={cwd:process.cwd(),workspace:result.paths.workspace,identity:author};
      // Exit our captured child after its durable event, before delivery acknowledgement.
      const crashCode='const {submitAuthorTurn}=await import('+JSON.stringify(operationModule)+');await submitAuthorTurn('+JSON.stringify(authorInput)+',{checkpoint(name){if(name==="author-event-appended")process.exit(17);}});';
      const interrupted=await operation(()=>fresh(crashCode));
      if(interrupted.status!==17) throw Error('owned post-event interruption did not occur: '+interrupted.stderr);
      const beforeRestart=JSON.parse(fs.readFileSync(path.join(result.paths.workspace,'protocol.json'),'utf8'));
      const recoveryCode='const {submitAuthorTurn}=await import('+JSON.stringify(operationModule)+');console.log(JSON.stringify(await submitAuthorTurn('+JSON.stringify(authorInput)+')));';
      const recovered=await operation(()=>fresh(recoveryCode));
      if(recovered.status!==0) throw Error(recovered.stderr);
      const next=JSON.parse(recovered.stdout);
      const afterRestart=JSON.parse(fs.readFileSync(path.join(result.paths.workspace,'protocol.json'),'utf8'));
      if(beforeRestart.state!=='reviewer-turn'||afterRestart.state!==beforeRestart.state||afterRestart.turns_used!==beforeRestart.turns_used) throw Error('restart changed the pending turn');
      const retryBefore=fs.readFileSync(result.paths.events,'utf8');
      await operation(()=>submitAuthorTurn(authorInput));
      if(fs.readFileSync(result.paths.events,'utf8')!==retryBefore) throw Error('exact author retry advanced twice');
      const revisions=retryBefore.trim().split('\n').map(line=>JSON.parse(line)).filter(event=>event.type==='author-revision-sealed-no-commit');
      if(revisions.length!==1) throw Error('interrupted handoff produced duplicate author revisions');
      for(const [heading,value] of [['Summary','Accepted.'],['Findings','None.'],['Required changes','None.'],['Optional suggestions','None.'],['Decision','accepted']]) section(next.paths.response,heading,value);
      await operation(()=>submitReviewTurn({cwd:process.cwd(),workspace:result.paths.workspace,identity:reviewer,decision:'accepted'}));
      const firstFinal=await operation(()=>finalizeReview({cwd:process.cwd(),workspace:result.paths.workspace,identity:author}));
      if(firstFinal.state!=='awaiting-phase-artifact') throw Error('spec phase did not wait for the plan artifact');
      const planTurn=await operation(()=>advanceReview({cwd:process.cwd(),workspace:result.paths.workspace,identity:author,artifact:'plan.md'}));
      for(const [heading,value] of [['Summary','Plan accepted.'],['Findings','None.'],['Required changes','None.'],['Optional suggestions','None.'],['Decision','accepted']]) section(planTurn.paths.response,heading,value);
      await operation(()=>submitReviewTurn({cwd:process.cwd(),workspace:result.paths.workspace,identity:reviewer,decision:'accepted'}));
      const final=await operation(()=>finalizeReview({cwd:process.cwd(),workspace:result.paths.workspace,identity:author}));
      const terminal=fs.readFileSync(result.paths.events,'utf8').trim().split('\n').map(line=>JSON.parse(line)).findLast(event=>event.type==='acceptance-sealed-no-commit');
      const phaseSnapshotIsCurrent=terminal.payload.terminal.snapshot_digest===expectedPlanDigest;
      // A phase accepted as written must also retain a real coordination snapshot.
      const second=await operation(()=>startReview({cwd:process.cwd(),artifact:'artifact.md',artifactKind:'spec',phases:'spec,plan',reviewId:'review-local-phases-as-written',issue:190,reviewerProvider:'codex',reviewerModel:'declared-model',reviewerEffort:'medium',transportMode:'manual',identity:author}));
      const secondJoin=await operation(()=>joinReview({cwd:process.cwd(),invitation:second.paths.reviewer_invitation,identity:reviewer}));
      const acceptNotes=(file)=>{
        for(const [heading,value] of [['Summary','Accepted as written.'],['Findings','None.'],['Required changes','None.'],['Optional suggestions','None.'],['Decision','accepted']]) section(file,heading,value);
      };
      acceptNotes(secondJoin.paths.response);
      await operation(()=>submitReviewTurn({cwd:process.cwd(),workspace:second.paths.workspace,identity:reviewer,decision:'accepted'}));
      await operation(()=>finalizeReview({cwd:process.cwd(),workspace:second.paths.workspace,identity:author}));
      const secondPlan=await operation(()=>advanceReview({cwd:process.cwd(),workspace:second.paths.workspace,identity:author,artifact:'plan.md'}));
      acceptNotes(secondPlan.paths.response);
      await operation(()=>submitReviewTurn({cwd:process.cwd(),workspace:second.paths.workspace,identity:reviewer,decision:'accepted'}));
      await operation(()=>finalizeReview({cwd:process.cwd(),workspace:second.paths.workspace,identity:author}));
      const serviceModule=${module('src/protocol/service.mjs')};
      function restart() {
        const before=gitState();
        const code='const {readReview}=await import('+JSON.stringify(serviceModule)+');try {await readReview('+JSON.stringify(result.paths.workspace)+');console.log(JSON.stringify({ok:true}));}catch(error){console.log(JSON.stringify({ok:false,code:error.code}));}';
        const child=childProcess.spawnSync(process.execPath,['--import',profile,'--input-type=module','-e',code],{cwd:process.cwd(),encoding:'utf8',env:process.env,timeout:30000});
        if(child.status!==0) throw Error(child.stderr);
        if(gitState()!==before) throw Error('restart changed Git state');
        return JSON.parse(child.stdout);
      }
      const validSnapshot=fs.readFileSync(initialSnapshot);
      fs.writeFileSync(initialSnapshot,'damaged snapshot\n');
      const damaged=restart();
      fs.unlinkSync(initialSnapshot);
      const missing=restart();
      fs.writeFileSync(initialSnapshot,validSnapshot);
      const restored=restart();
      const snapshotRestartSafe=damaged.code==='APR_SNAPSHOT_CORRUPT' && missing.code==='APR_SNAPSHOT_CORRUPT' && restored.ok===true;
      const lockWorkspace=path.join(result.paths.workspace,'contention');
      const lockFile=path.join(lockWorkspace,'locks','review.lock');
      fs.mkdirSync(path.dirname(lockFile),{recursive:true});
      const os=await import('node:os');
      const lockBytes=JSON.stringify({schema:'ai-peer-review.lock/v2',token:'00000000-0000-4000-8000-000000000001',pid:process.pid,host:os.hostname(),boot_id:'unverified-boot',process_start:'unverified-start',acquired_at:new Date().toISOString()})+'\n';
      fs.writeFileSync(lockFile,lockBytes);
      let entered=false;
      try {await withReviewLock(lockWorkspace,()=>{entered=true;});} catch(error) {
        if(!['APR_REVIEW_LOCK_BUSY','APR_REVIEW_LOCK_LIVENESS_UNKNOWN'].includes(error.code)) throw error;
      }
      if(entered || fs.readFileSync(lockFile,'utf8')!==lockBytes) throw Error('unverified live owner was stolen');
      if(fs.readFileSync('unrelated.txt' ,'utf8')!=='human work'||fs.readFileSync('untracked.txt','utf8')!=='human untracked work') throw Error('unrelated work changed');
      console.log(JSON.stringify({ok:true,commitMode:result.review.commit_mode,transportMode:result.review.transport_mode,securityProcesses,sourceClassReads,gitInventories,operations,phaseSnapshotIsCurrent,initialSnapshotDurable,legacyRefusedWithoutWrite,snapshotRestartSafe,state:final.state,modeNotice:result.review.mode_notice}));
    } catch(error) {
      console.log(JSON.stringify({ok:false,code:error.code,message:error.message,securityProcesses}));
    }
  `;
    for (const executionRoot of [root, linked]) {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          new URL('../helpers/installed-provider/account-profile.mjs', import.meta.url).href,
          '--input-type=module',
          '-e',
          script,
        ],
        {
          cwd: executionRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            HOME: home,
            XDG_CONFIG_HOME: path.join(home, '.config'),
            APR_FIXTURE_ACCOUNT_HOME: home,
          },
          timeout: Math.max(1, testDeadline - Date.now()),
        }
      );
      assert.equal(result.status, 0, result.stderr);
      const observed = JSON.parse(result.stdout);
      assert.equal(observed.ok, true, JSON.stringify(observed));
      assert.equal(observed.commitMode, 'no-commit');
      assert.equal(observed.transportMode, 'manual');
      assert.equal(observed.legacyRefusedWithoutWrite, true);
      assert.equal(observed.initialSnapshotDurable, true, JSON.stringify(observed));
      assert.equal(observed.snapshotRestartSafe, true, JSON.stringify(observed));
      assert.deepEqual(observed.securityProcesses, []);
      assert.deepEqual(observed.sourceClassReads, []);
      assert.doesNotMatch(observed.modeNotice, /TEST MODE/);
      assert.deepEqual(observed.gitInventories, []);
      assert.equal(observed.operations, 18);
      assert.equal(observed.phaseSnapshotIsCurrent, true, JSON.stringify(observed));
      assert.equal(observed.state, 'accepted-uncommitted');
    }
  }
);
