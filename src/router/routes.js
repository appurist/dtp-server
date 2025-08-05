export const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: 'Dashboard' }
  },
  {
    path: '/chart',
    name: 'chart',
    component: () => import('@/views/Chart.vue'),
    meta: { title: 'Trading Chart' }
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('@/views/Accounts.vue'),
    meta: { title: 'Trading Accounts' }
  },
  {
    path: '/algorithms',
    name: 'algorithms',
    component: () => import('@/views/Algorithms.vue'),
    meta: { title: 'Algorithm Management' }
  },
  {
    path: '/algorithms/:id',
    name: 'algorithm-editor',
    component: () => import('@/views/AlgorithmEditor.vue'),
    meta: { title: 'Algorithm Editor' }
  },
  {
    path: '/instances',
    name: 'instances',
    component: () => import('@/views/Instances.vue'),
    meta: { title: 'Trading Instances' }
  },
  {
    path: '/backtesting',
    name: 'backtesting',
    component: () => import('@/views/Backtesting.vue'),
    meta: { title: 'Backtesting' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: 'Settings' }
  },
  {
    path: '/connection',
    redirect: '/settings'
  }
]
