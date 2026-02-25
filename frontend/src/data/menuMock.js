export const menuTree = [
    {
      id: "bizxr",
      title: "BizXR",
      children: [
        {
          id: "bizxr-base",
          title: "기초관리",
          children: [
            { id: "user", title: "사용자관리", path: "/app/user" },
            { id: "dept", title: "부서관리", path: "/app/dept" },
          ],
        },
        {
          id: "bizxr-sales",
          title: "영업",
          children: [
            { id: "order", title: "수주등록", path: "/app/order" },
            { id: "ship", title: "출하등록", path: "/app/ship" },
          ],
        },
      ],
    },
    {
      id: "bizdx",
      title: "BizDX",
      children: [
        { id: "dx-1", title: "전표조회", path: "/app/dx/voucher" },
        { id: "dx-2", title: "환경설정", path: "/app/dx/env" },
      ],
    },
  ];
  