import { exec } from 'child_process';
import { Container } from 'typedi';
import { Crontab, CrontabStatus } from '../data/cron';
import CronService from '../services/cron';
import CookieService from '../services/cookie';

const initData = [
  {
    name: '更新面板',
    command: `ql update`,
    schedule: `${randomSchedule(60, 1)} ${randomSchedule(
      6,
      1,
    ).toString()} * * *`,
    status: CrontabStatus.disabled,
  },
  {
    name: '删除日志',
    command: 'ql rmlog 7',
    schedule: '30 7 */7 * *',
    status: CrontabStatus.idle,
  },
  {
    name: '互助码',
    command: 'ql code',
    schedule: '30 7 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: '关注有礼单独仓库',
    command: 'ql raw https://raw.githubusercontent.com/curtinlv/JD-Script/main/getFollowGifts/jd_getFollowGift.py',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: 'ddo（hyzaw）仓库',
    command: 'ql repo https://hub.fastgit.org/hyzaw/scripts.git "ddo_"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: 'Ariszy（Zhiyi-N）仓库',
    command: 'ql repo https://hub.fastgit.org/Ariszy/Private-Script.git "JD"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: 'zoopanda（动物园）仓库',
    command: 'ql repo https://hub.fastgit.org/zooPanda/zoo.git "zoo"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: '混沌仓库',
    command: 'ql repo https://hub.fastgit.org/whyour/hundun.git "quanx" "tokens|caiyun|didi|donate|fold|Env"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: 'star261仓库',
    command: 'ql repo https://hub.fastgit.org/star261/jd.git "scripts" "code"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: 'ZCY01仓库',
    command: 'ql repo https://hub.fastgit.org/ZCY01/daily_scripts.git "jd_"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: '龙猪猪仓库',
    command: 'ql repo https://hub.fastgit.org/longzhuzhu/nianyu.git "qx" “main”',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: '温某人仓库',
    command: 'ql repo https://hub.fastgit.org/Wenmoux/scripts.git "jd" "" "" "wen"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  {
    name: '柠檬代维护lxk仓库',
    command: 'ql repo https://hub.fastgit.org/panghu999/jd_scripts.git "jd_|jx_|getJDCookie" "activity|backUp" "^jd[^_]|USER"',
    schedule: '0 8,12,16,20,0 * * *',
    status: CrontabStatus.idle,
  },
  
  
];

export default async () => {
  const cronService = Container.get(CronService);
  const cookieService = Container.get(CookieService);
  const cronDb = cronService.getDb();

  cronDb.count({}, async (err, count) => {
    if (count === 0) {
      const data = initData.map((x) => {
        const tab = new Crontab(x);
        tab.created = new Date().valueOf();
        tab.saved = false;
        if (tab.name === '更新面板') {
          tab.isSystem = 1;
        } else {
          tab.isSystem = 0;
        }
        return tab;
      });
      cronDb.insert(data);
      await cronService.autosave_crontab();
    }
  });

  // patch更新面板任务状态
  cronDb.find({ name: '更新面板' }).exec((err, docs) => {
    const doc = docs[0];
    if (doc && doc.status === CrontabStatus.running) {
      cronDb.update(
        { name: '更新面板' },
        { $set: { status: CrontabStatus.idle } },
      );
    }
  });

  // 初始化时执行一次所有的ql repo 任务
  cronDb
    .find({
      command: /ql (repo|raw)/,
    })
    .exec((err, docs) => {
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        if (doc && doc.isDisabled !== 1) {
          exec(doc.command);
        }
      }
    });

  // patch 禁用状态字段改变
  cronDb
    .find({
      status: CrontabStatus.disabled,
    })
    .exec((err, docs) => {
      if (docs.length > 0) {
        const ids = docs.map((x) => x._id);
        cronDb.update(
          { _id: { $in: ids } },
          { $set: { status: CrontabStatus.idle, isDisabled: 1 } },
          { multi: true },
          (err) => {
            cronService.autosave_crontab();
          },
        );
      }
    });

  // 初始化保存一次ck和定时任务数据
  await cronService.autosave_crontab();
  await cookieService.set_cookies();
};

function randomSchedule(from: number, to: number) {
  const result = [];
  const arr = [...Array(from).keys()];
  let count = arr.length;
  for (let i = 0; i < to; i++) {
    const index = ~~(Math.random() * count) + i;
    if (result.includes(arr[index])) {
      continue;
    }
    result[i] = arr[index];
    arr[index] = arr[i];
    count--;
  }
  return result;
}
