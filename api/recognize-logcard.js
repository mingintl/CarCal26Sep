const axios = require('axios');

module.exports = async (req, res) => {
  // 跨域配置，允许Netlify前端调用
  res.setHeader('Access‑Control‑Allow‑Origin', '*');
  res.setHeader('Access‑Control‑Allow‑Methods', 'POST,OPTIONS');
  res.setHeader('Access‑Control‑Allow‑Headers', 'Content‑Type');

  if(req.method === "OPTIONS"){
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({error:"仅支持POST请求"});
  }

  const { imageBase64 } = req.body;
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) return res.status(500).json({error:"未配置API密钥"});

  const prompt = `你处理新加坡LTA Log‑Card截图。
只提取下面字段，严格输出JSON，不要任何解释文字，不要markdown标记。
字段：
plate:车牌号字符串
model:完整车型
color:车身颜色字符串
transferCount:过户总次数，数字
arf:Actual ARF Paid，纯数字，千万不要把OMV的值当成ARF
firstRegistrationDate:首次注册日期，格式YYYY‑MM‑DD
如果某个字段图片找不到，值填null。`;

  try {
    const resp = await axios.post(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal‑generation/generation",
      {
        model:"qwen3.7‑flash",
        input:{
          messages:[
            {
              role:"user",
              content:[
                {type:"text", text: prompt},
                {type:"image_url", image_url:{url:imageBase64}}
              ]
            }
          ]
        },
        parameters:{result_format:"json"}
      },
      {headers:{"Authorization":`Bearer ${apiKey}`}}
    );

    const content = resp.data?.output?.choices?.[0]?.message?.content;
    let jsonStr;
    if(Array.isArray(content)){
      jsonStr = content[0].text;
    }else{
      jsonStr = content;
    }
    // 清理markdown ```json 标记
    jsonStr = jsonStr.replace(/```json/g,"").replace(/```/g,"").trim();
    const jsonData = JSON.parse(jsonStr);
    res.status(200).json(jsonData);

  } catch(err) {
    console.error(err);
    res.status(500).json({
      error:"识别失败",
      detail: err?.message || String(err)
    });
  }
};