---
name: Bug report
about: Create a report to help us improve
title: "[BUG]: title"
labels: bug
assignees: ''

---

**0. Make sure the bug is NLU related:**

If you are using the NLU Server or the Language Server through Botpress, ensure that the bug you want to report is NLU related. When in doubt, please report the issue on the [main Botpress repo](https://github.com/botpress/botpress).

- [ ] I confirm that the reported bug concerns the NLU independently of Botpress

**1. Complete the following information:**
 - OS:
 - CLI Version (Displayed using CLI argument `--version`):
 - Infrastructure (sources, binary or docker): 
 - Product (nlu-server, lang-server, other):
 - Product Version (Displayed in logs):

**2. Provide your config:**
<details>
<summary>Configurations</summary>

- The CLI arguments used:
```bash
./nlu --parameter your-argument
```

- The environment variables used:
```
PARAMETER="your-argument" ./nlu
```

- The content of your configuration file if applicable:
```json
{
  "parameter": "your-argument"
}
```

</details>

**3. Describe the bug**

The bug description...
