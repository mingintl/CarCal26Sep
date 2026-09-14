export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error:"只支持POST请求"});
  const { imageBase64 } = req.body;
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return res.status(400).json({error:"未配置DASHSCOPE_API_KEY"});

  try {
    const resp = await fetch("https://dashscope.aliyuncs.com/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${apiKey}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model:"qwen3.7-flash",
        messages:[
          {
            role:"user",
            content:[
              {
                type:"image_url",
                image_url: {
                  url: imageBase64
                }
              },
              {
                type:"text",
                text:`这是新加坡LTA Log-Card车辆证件图片。
严格提取下面信息，**只返回纯净JSON，不要任何多余文字、解释、Markdown**。
字段定义：
plate：车牌号
model：完整车型
color：车身颜色
transferCount：过户次数（没有过户写数字0）
arf：Actual ARF Paid金额，**严禁读取OMV**，纯数字
firstRegistrationDate：首次注册日期，格式 YYYY-MM-DD

输出示例：
{
"plate":"SJV3293S",
"model":"GLA180 PROGRESSIVE",
"color":"Silver",
"transferCount":0,
"arf":40397,
"firstRegistrationDate":"2023-05-30"
}`
              }
            ]
          }
        ]
        // 重点：这里完全不写 result_format !!!
      })
    });
    const data = await resp.json();
    if(!resp.ok) throw data;
    const rawText = data.choices[0].message.content;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw "AI返回找不到JSON";
    const result = JSON.parse(jsonMatch[0]);
    res.status(200).json(result);
  } catch(err){
    res.status(500).json({
      error:"AI调用失败",
      detail:JSON.stringify(err)
    });
  }
}