// Cốt truyện và thông số từng đêm
window.STORY = {
  title: {
    eyebrow: "Đảo Hòn Gió",
    title: "Ngọn Hải Đăng Cuối Cùng",
    text: [
      "Mười năm rời đảo, Mai trở về khi nhận tin ông ngoại ngã bệnh. Ông là người gác ngọn hải đăng cuối cùng của Hòn Gió.",
      "Tối đó, đài báo bão. Đội thuyền đánh cá vẫn còn ngoài khơi, và ông thì không đứng dậy nổi.",
      "Ông nắm tay Mai: <em>“Con lên tháp đi. Đèn còn sáng, thuyền còn về.”</em>",
    ],
    button: "Lên tháp đèn",
  },
  nights: [
    {
      name: "Đêm thứ nhất",
      title: "Gió nổi",
      text: [
        "Cầu thang xoắn ốc kêu cót két dưới chân. Ngọn đèn vẫn sáng, chỉ chờ người xoay.",
        "Phía dưới là dải đá ngầm mà dân đảo gọi là <em>Răng Rồng</em>. Thuyền nào không thấy đèn sẽ lao thẳng vào đó.",
      ],
      hint: "Di chuột hoặc chạm, kéo để xoay đèn. Giữ ánh sáng trên thuyền đến khi vòng tròn đầy.",
      goal: 6, speed: 30, spawn: 2.8, wind: 0, fog: false,
    },
    {
      name: "Đêm thứ hai",
      title: "Gió quật",
      text: [
        "Sáng ra, ông gượng dậy kể chuyện: năm xưa bà ngoại cũng từng thay ông gác đèn suốt một mùa bão.",
        "Đêm nay gió mạnh hơn. Thuyền sẽ <em>bị gió đẩy dạt ngang</em>, phải bám theo thật sát.",
      ],
      hint: "Gió đẩy thuyền chệch hướng. Đừng để thuyền nào trôi khỏi ánh đèn.",
      goal: 8, speed: 38, spawn: 2.3, wind: 1, fog: false,
    },
    {
      name: "Đêm thứ ba",
      title: "Sương mù",
      text: [
        "Đêm cuối của trận bão. Sương mù trắng đặc kéo tới từ biển, che hết mọi thứ.",
        "Trên đài, giọng một ngư dân rè rè: chiếc thuyền cuối cùng còn ngoài khơi là của <em>cậu Tư, con trai ông</em>.",
        "Trong sương, con chỉ nhìn thấy những gì đèn chiếu tới.",
      ],
      hint: "Thuyền chỉ hiện rõ khi nằm trong ánh đèn. Hãy quét đèn liên tục.",
      goal: 10, speed: 40, spawn: 2.1, wind: 0.6, fog: true,
    },
  ],
  lose: {
    eyebrow: "Răng Rồng",
    title: "Ngọn đèn chập chờn",
    text: ["Quá nhiều thuyền đã mất hướng trong đêm. Nhưng trời còn chưa sáng, và đèn vẫn còn dầu.", "Mai lau kính đèn, hít một hơi thật sâu."],
    button: "Thử lại đêm này",
  },
  ending: {
    eyebrow: "Bình minh",
    title: "Đèn còn sáng, thuyền còn về",
    text: [
      "Khi mặt trời nhô lên, chiếc thuyền cuối cùng cập bến. Cậu Tư nhảy lên bờ, chạy thẳng tới chân tháp.",
      "Ông ngoại đã ngồi sẵn ở bậc cửa, vai khoác chiếc áo mưa cũ. Ông không nói gì, chỉ gật đầu với Mai, như năm xưa ông từng gật đầu với bà.",
      "Từ hôm đó, Hòn Gió có một người gác đèn mới.",
    ],
    button: "Chơi lại từ đầu",
  },
};
